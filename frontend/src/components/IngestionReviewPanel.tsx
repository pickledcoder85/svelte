import { tc } from '../theme/palette';
import { pickPhotoFromCamera, prepareScanPhoto, type PreparedPhoto } from '../lib/web-photo';
import { addDaysToDateKey, localDateKey, localDateKeyForTimestamp } from '../lib/dates';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import {
  acceptIngestionOutput,
  fetchIngestionQueue,
  ingestNutritionLabel,
  lookupBarcode,
  rejectIngestionOutput,
  saveFoodFromIngestionOutput,
  scanFoodPackage,
  smartScan
} from '../lib/api';
import type { FoodItem, IngestionOutput, SmartScanResult, VisionPackageScanResult } from '../types';
import {
  buildAcceptedNutritionPayload,
  buildNutritionDraft,
  describeOutput,
  formatCreatedAt,
  applyAlternative,
  describeAlternative,
  matchInfo,
  getNutritionVariants,
  pendingOutputs,
  type EditableNutritionDraft
} from './ingestionReviewHelpers';
import { WebBarcodeScanner } from './WebBarcodeScanner';
import { AddFoodSheet } from './AddFoodSheet';
import { localDateKey as todayDateKey } from '../lib/dates';
import { formatDate, useT, type TFunction } from '../i18n';

interface IngestionReviewPanelProps {
  accessToken: string | null;
  /** Called after a scanned food is added to today, so the day's totals refresh. */
  onFoodLogged?(): void;
  /** Open the scanner as soon as the screen shows (from Today's "add food" choice). */
  autoStartScan?: boolean;
  onAutoStartHandled?(): void;
}

type SyncTone = 'checking' | 'live';

export function IngestionReviewPanel({ accessToken, onFoodLogged, autoStartScan, onAutoStartHandled }: IngestionReviewPanelProps) {
  const t = useT();
  const cameraRef = useRef<CameraView | null>(null);
  const guidePulse = useRef(new Animated.Value(0)).current;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [outputs, setOutputs] = useState<IngestionOutput[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<IngestionOutput | null>(null);
  const [tone, setTone] = useState<SyncTone>('checking');
  const [statusLabel, setStatusLabel] = useState(() => t('scans.status.loading'));
  const [statusDetail, setStatusDetail] = useState(() => t('scans.status.loadingDetail'));
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [packageFileName, setPackageFileName] = useState<string | null>(null);
  const [labelFileName, setLabelFileName] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState<'package' | 'label' | 'barcode' | 'smart' | null>(null);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [cameraStep, setCameraStep] = useState<'package' | 'label' | null>(null);
  const [lastPackageScan, setLastPackageScan] = useState<VisionPackageScanResult | null>(null);
  const [savedFoods, setSavedFoods] = useState<FoodItem[]>([]);
  const [savingFoodId, setSavingFoodId] = useState<string | null>(null);
  const [nutritionDraft, setNutritionDraft] = useState<EditableNutritionDraft>(() => buildNutritionDraft(null));
  const [editingFields, setEditingFields] = useState(false);
  const [expandedScanDates, setExpandedScanDates] = useState<Record<string, boolean>>({});
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  // The package scan the open scanner's label would replace (set when the scanner opens).
  const smartReplaceRef = useRef<string | null>(null);
  // A barcode that came back without nutrition: the next label read updates that product.
  const missingBarcodeRef = useRef<string | null>(null);
  const [smartLabelOnly, setSmartLabelOnly] = useState(false);

  useEffect(() => {
    if (autoStartScan && accessToken && Platform.OS === 'web') {
      openSmartScanner();
      onAutoStartHandled?.();
    }
    // Once per request from Today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartScan, accessToken]);

  useEffect(() => {
    setNutritionDraft(buildNutritionDraft(selectedOutput?.structured_json));
    setEditingFields(false);
  }, [selectedOutput]);

  useEffect(() => {
    const groups = groupOutputsByDate(outputs, t);
    setExpandedScanDates((current) => {
      const next: Record<string, boolean> = {};
      groups.forEach((group, index) => {
        next[group.dateKey] = current[group.dateKey] ?? index === 0;
      });
      return next;
    });
  }, [outputs]);

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      await refreshQueue(cancelled);
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  async function refreshQueue(cancelled = false) {
    setQueueLoading(true);
    setQueueError(null);
    setTone('checking');
    setStatusLabel(t('scans.status.loading'));
    setStatusDetail(t('scans.status.loadingDetail'));

    if (!accessToken) {
      if (cancelled) {
        return;
      }

      setOutputs([]);
      setSelectedOutputId(null);
      setSelectedOutput(null);
      setTone('checking');
      setStatusLabel(t('scans.status.signIn'));
      setStatusDetail(t('scans.status.signInDetail'));
      setQueueLoading(false);
      return;
    }

    try {
      const queue = await fetchIngestionQueue(accessToken);
      if (cancelled) {
        return;
      }

      const pending = pendingOutputs(queue);
      setOutputs(pending);
      setSelectedOutputId((current) =>
        current && pending.some((output) => output.id === current) ? current : pending[0]?.id ?? current ?? null
      );
      setSelectedOutput((current) => {
        if (current && current.review_state !== 'pending') {
          return current;
        }
        if (current && pending.some((output) => output.id === current.id)) {
          return pending.find((output) => output.id === current.id) ?? current;
        }
        return pending[0] ?? current ?? null;
      });
      setTone('live');
      setStatusLabel(t('scans.status.scans'));
      setStatusDetail(pending.length === 0 ? t('scans.status.none') : t('scans.status.pending', { count: pending.length }));
    } catch (error) {
      if (cancelled) {
        return;
      }

      setOutputs([]);
      setSelectedOutputId(null);
      setSelectedOutput(null);
      setTone('checking');
      setStatusLabel(t('scans.status.unavailable'));
      setStatusDetail(t('scans.status.unavailableDetail'));
      setQueueError(error instanceof Error ? error.message : t('scans.status.queueError'));
    } finally {
      if (!cancelled) {
        setQueueLoading(false);
      }
    }
  }

  async function createPackageScanFromBase64(imageBase64: string) {
    if (!accessToken || captureLoading || imageBase64.length === 0) {
      return;
    }

    setCaptureLoading('package');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel(t('scans.status.scanningPackage'));
    setStatusDetail(t('scans.status.scanningPackageDetail'));

    try {
      const scan = await scanFoodPackage(imageBase64, accessToken);
      const output = buildPendingOutput(scan.output_id, scan.ingestion_job_id, scan.confidence, scan.extraction);
      setLastPackageScan(scan);
      setSelectedOutputId(output.id);
      setSelectedOutput(output);
      await refreshQueue();
      setTone('live');
      setStatusLabel(t('scans.status.packageScanned'));
      setStatusDetail(t('scans.status.packageRead', { name: scan.extraction.product_name }));
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.packageFailed'));
      setStatusDetail(t('scans.status.packageFailedDetail'));
      setQueueError(error instanceof Error ? error.message : `${t('scans.status.packageFailed')}.`);
    } finally {
      setCaptureLoading(null);
    }
  }

  /** replaceOutputId: a package scan whose guessed nutrition this label replaces (discarded). */
  async function createLabelScanFromBase64(imageBase64: string, replaceOutputId?: string) {
    if (!accessToken || captureLoading || imageBase64.length === 0) {
      return;
    }

    setCaptureLoading('label');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel(t('scans.status.scanningLabel'));
    setStatusDetail(t('scans.status.scanningLabelDetail'));

    try {
      const scan = await ingestNutritionLabel(imageBase64, accessToken);
      const output = buildPendingOutput(scan.output_id, scan.ingestion_job_id, scan.confidence, scan.extraction);
      // The label's real numbers replace a package scan's guess: discard that scan so only
      // one food is saved.
      let replaced = false;
      if (replaceOutputId) {
        try {
          await rejectIngestionOutput(replaceOutputId, accessToken);
          replaced = true;
        } catch {
          // Already saved or gone: keep it, and don't claim a replacement.
        }
      }
      setSelectedOutputId(output.id);
      setSelectedOutput(output);
      await refreshQueue();
      setTone('live');
      setStatusLabel(t('scans.status.labelScanned'));
      setStatusDetail(replaced ? t('scans.status.labelReplaced') : t('scans.status.checkThenSave'));
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.labelFailed'));
      setStatusDetail(t('scans.status.labelFailedDetail'));
      setQueueError(error instanceof Error ? error.message : `${t('scans.status.labelFailed')}.`);
    } finally {
      setCaptureLoading(null);
    }
  }

  async function reviewOutput(outputId: string, action: 'accept' | 'reject') {
    if (!accessToken || actioningId === outputId) {
      return;
    }

    setActioningId(outputId);
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel(action === 'accept' ? t('scans.status.accepting') : t('scans.status.rejecting'));
    setStatusDetail(t('scans.status.savingDecision'));

    try {
      const reviewed =
        action === 'accept'
          ? await acceptIngestionOutput(
              outputId,
              accessToken,
              buildAcceptedNutritionPayload(nutritionDraft, selectedOutput?.structured_json)
            )
          : await rejectIngestionOutput(outputId, accessToken);

      setOutputs((current) => current.filter((item) => item.id !== reviewed.id));
      setSelectedOutputId(reviewed.id);
      setSelectedOutput(reviewed);
      setEditingFields(false);
      setTone('live');
      setStatusLabel(action === 'accept' ? t('scans.status.accepted') : t('scans.status.rejected'));
      setStatusDetail(describeOutput(reviewed));
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.reviewFailed'));
      setStatusDetail(t('scans.status.reviewFailedDetail'));
      setQueueError(error instanceof Error ? error.message : t('scans.status.reviewError'));
    } finally {
      setActioningId(null);
    }
  }

  /** Save: accept the scan with any edits, then save it to the food bank, in one step. */
  async function saveScan() {
    if (!accessToken || !selectedOutput || actioningId || savingFoodId) {
      return;
    }
    const outputId = selectedOutput.id;
    setActioningId(outputId);
    setSavingFoodId(outputId);
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel(t('scans.status.saving'));
    setStatusDetail(t('scans.status.savingDetail'));
    try {
      const accepted =
        selectedOutput.review_state === 'accepted'
          ? selectedOutput
          : await acceptIngestionOutput(
              outputId,
              accessToken,
              buildAcceptedNutritionPayload(nutritionDraft, selectedOutput.structured_json)
            );
      setOutputs((current) => current.filter((item) => item.id !== outputId));
      setSelectedOutput(accepted);
      setEditingFields(false);
      const result = await saveFoodFromIngestionOutput(outputId, accessToken);
      setSavedFoods(result.saved_foods);
      setTone('live');
      setStatusLabel(t('scans.status.saved'));
      setStatusDetail(
        result.saved_foods.length === 1
          ? t('scans.status.savedOne', { name: result.saved_foods[0].name })
          : t('scans.status.savedMany', { count: result.saved_foods.length })
      );
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.saveFailed'));
      setStatusDetail(t('scans.status.saveFailedDetail'));
      setQueueError(error instanceof Error ? error.message : t('foodSheet.saveError'));
    } finally {
      setActioningId(null);
      setSavingFoodId(null);
    }
  }

  async function saveSelectedFood() {
    if (!accessToken || !selectedOutput || selectedOutput.review_state !== 'accepted' || savingFoodId) {
      return;
    }

    setSavingFoodId(selectedOutput.id);
    setQueueError(null);
    setTone('checking');
    setStatusLabel(t('scans.status.savingItem'));
    setStatusDetail(t('scans.status.savingItemDetail'));

    try {
      const result = await saveFoodFromIngestionOutput(selectedOutput.id, accessToken);
      setSavedFoods(result.saved_foods);
      setTone('live');
      setStatusLabel(result.saved_foods.length === 1 ? t('scans.status.foodSaved') : t('scans.status.foodsSaved'));
      setStatusDetail(
        result.saved_foods.length === 1
          ? t('scans.status.catalogOne', { name: result.saved_foods[0].name })
          : t('scans.status.catalogMany', { count: result.saved_foods.length })
      );
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.foodSaveFailed'));
      setStatusDetail(t('scans.status.foodSaveFailedDetail'));
      setQueueError(error instanceof Error ? error.message : t('scans.status.foodSaveError'));
    } finally {
      setSavingFoodId(null);
    }
  }

  async function beginCapture() {
    if (captureLoading) {
      return;
    }

    if (Platform.OS === 'web') {
      await captureWebPhoto('package');
      return;
    }

    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission?.granted) {
      setQueueError(t('scans.status.cameraPermission'));
      return;
    }

    setQueueError(null);
    setCameraStep('package');
  }

  async function captureFromCamera() {
    if (!cameraStep || !cameraRef.current || captureLoading) {
      return;
    }

    const activeStep = cameraStep;
    setQueueError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const base64 = photo.base64 ?? '';
      if (!base64) {
        throw new Error(t('scans.status.noImageData'));
      }

      if (activeStep === 'package') {
        setPackageFileName(`live-package-${Date.now()}.jpg`);
        await createPackageScanFromBase64(base64);
        await runGuidePulse(guidePulse);
        setCameraStep('label');
        setStatusLabel(t('scans.status.packageCreated'));
        setStatusDetail(t('scans.status.packageCreatedDetail'));
      } else {
        setLabelFileName(`live-label-${Date.now()}.jpg`);
        await createLabelScanFromBase64(base64);
        await runGuidePulse(guidePulse);
        setCameraStep(null);
      }
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : t('scans.status.captureError'));
    } finally {
      if (activeStep !== 'package') {
        setCameraStep(null);
      }
    }
  }

  async function captureWebPhoto(step: 'package' | 'label' | 'smart', replaceOutputId?: string) {
    if (captureLoading || !accessToken) {
      if (!accessToken) {
        setQueueError(t('scans.status.signInFirst'));
      }
      return;
    }
    setQueueError(null);
    // Open the camera synchronously inside the tap: iOS only allows it from a user gesture.
    const file = await pickPhotoFromCamera();
    if (!file) {
      return;
    }

    if (step === 'smart') {
      // A full photo through the same one-read scan (package front or label).
      await readSmartImage(file, replaceOutputId ?? null);
      return;
    }

    let prepared: PreparedPhoto;
    try {
      setTone('checking');
      setStatusLabel(t('scans.status.preparing'));
      setStatusDetail(t('scans.status.preparingDetail'));
      prepared = await prepareScanPhoto(file);
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.photoUnusable'));
      setStatusDetail(t('scans.status.photoUnusableDetail'));
      setQueueError(error instanceof Error ? error.message : t('scans.status.photoError'));
      return;
    }

    const fileName = `${step}-${Date.now()}.jpg`;
    if (step === 'package') {
      setPackageFileName(fileName);
      await createPackageScanFromBase64(prepared.base64);
    } else {
      setLabelFileName(fileName);
      await createLabelScanFromBase64(prepared.base64, replaceOutputId);
    }
  }

  /** The smart scanner: barcode live, or a package front / label captured once it's steady. */
  function openSmartScanner(replaceOutputId?: string) {
    if (captureLoading) {
      return;
    }
    if (!accessToken) {
      setQueueError(t('scans.status.signInFirst'));
      return;
    }
    smartReplaceRef.current = replaceOutputId ?? null;
    // Replacing a match needs the label, not the barcode right next to it.
    setSmartLabelOnly(Boolean(replaceOutputId));
    setQueueError(null);
    setBarcodeScannerOpen(true);
  }

  async function readSmartImage(image: Blob, replaceOutputId: string | null) {
    if (!accessToken) {
      return;
    }
    setCaptureLoading('smart');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel(t('scan.reading'));
    setStatusDetail(t('scans.status.readingDetail'));
    try {
      const prepared = await prepareScanPhoto(image);
      const result = await smartScan(prepared.base64, accessToken, replaceOutputId, missingBarcodeRef.current);
      if (result.kind === 'nutrition_label') {
        missingBarcodeRef.current = null;
      }
      await showSmartResult(result);
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.scanFailed'));
      setStatusDetail(t('scans.status.scanFailedDetail'));
      setQueueError(error instanceof Error ? error.message : t('scan.failed'));
    } finally {
      setCaptureLoading(null);
    }
  }

  async function showSmartResult(result: SmartScanResult) {
    if (result.kind === 'meal_plate') {
      setTone('checking');
      setStatusLabel(t('scans.status.plate'));
      setStatusDetail(t('scans.status.plateDetail'));
      return;
    }
    if (result.kind === 'unreadable' || !result.output_id || !result.ingestion_job_id) {
      setTone('checking');
      setStatusLabel(t('scans.status.unreadable'));
      setStatusDetail(result.message ?? t('scans.status.unreadableDetail'));
      return;
    }
    const extraction = result.kind === 'nutrition_label' ? result.label : result.package;
    const output = buildPendingOutput(result.output_id, result.ingestion_job_id, extraction?.confidence ?? 0.7, extraction);
    setSelectedOutputId(output.id);
    setSelectedOutput(output);
    await refreshQueue();
    setTone('live');
    if (result.kind === 'nutrition_label') {
      setStatusLabel(t('scans.status.labelRead'));
      setStatusDetail(result.replaced ? t('scans.status.labelReplaced') : t('scans.status.checkThenSave'));
    } else {
      setStatusLabel(t('scans.status.packageFrontRead'));
      setStatusDetail(t('scans.status.packageRead', { name: result.package?.product_name ?? t('scans.status.thePackage') }));
    }
  }

  async function lookUpScannedBarcode(code: string) {
    setBarcodeScannerOpen(false);
    missingBarcodeRef.current = null;
    if (!accessToken) {
      return;
    }
    setCaptureLoading('barcode');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel(t('scans.status.lookingUp'));
    setStatusDetail(t('scans.status.lookingUpDetail', { code }));

    try {
      const result = await lookupBarcode(code, accessToken);
      if (result.food) {
        setSavedFoods([result.food]);
        setTone('live');
        setStatusLabel(t('scans.status.inBank'));
        setStatusDetail(t('scans.status.inBankDetail', { name: result.food.name }));
      } else if (result.output) {
        const output = result.output;
        setSelectedOutputId(output.id);
        setSelectedOutput(output);
        await refreshQueue();
        setTone('live');
        setStatusLabel(t('scans.status.barcodeFound'));
        setStatusDetail(
          t('scans.status.barcodeFoundDetail', { name: describeOutput(output), source: result.source === 'usda' ? 'USDA' : 'Open Food Facts' })
        );
      } else {
        setTone('checking');
        missingBarcodeRef.current = code;
        setStatusLabel(t('scans.status.barcodeNotFound'));
        setStatusDetail(result.message ?? t('scans.status.barcodeNotFoundDetail'));
      }
    } catch (error) {
      setTone('checking');
      setStatusLabel(t('scans.status.barcodeFailed'));
      setStatusDetail(t('scans.status.barcodeFailedDetail'));
      setQueueError(error instanceof Error ? error.message : t('scan.barcodeFailed'));
    } finally {
      setCaptureLoading(null);
    }
  }

  function skipLabelCapture() {
    setCameraStep(null);
    setTone('live');
    setStatusLabel(t('scans.status.packageReady'));
    setStatusDetail(t('scans.status.packageReadyDetail'));
  }

  const displayOutput = selectedOutput;
  const pendingCount = outputs.length;
  const recentScanGroups = groupOutputsByDate(outputs, t);
  const browserViewingMode = Platform.OS === 'web';
  const nutritionVariants = getNutritionVariants(displayOutput?.structured_json);
  const hasAdditionalVariants =
    typeof displayOutput?.structured_json === 'object'
    && displayOutput.structured_json !== null
    && (displayOutput.structured_json as { multiple_variants_detected?: unknown }).multiple_variants_detected === true
    && nutritionVariants.length > 0;
  const cameraReady =
    Platform.OS !== 'web' &&
    (cameraPermission?.granted
      ? t('scans.cameraReady')
      : t('scans.cameraGrant'));
  const canReview =
    displayOutput !== null &&
    displayOutput.review_state === 'pending' &&
    hasValidNutritionDraft(nutritionDraft) &&
    actioningId !== displayOutput.id;
  const guideBorderColor = guidePulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.88)', 'rgba(74,222,128,0.98)']
  });

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>{t('scans.eyebrow')}</Text>
      <Text style={styles.title}>{t('scans.title')}</Text>
      <Text style={styles.detail}>{t('scans.intro')}</Text>

      <View style={[styles.statusBanner, { borderColor: toneColor(tone) }]}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.statusDetail}>{statusDetail}</Text>
        {queueError ? <Text style={styles.errorText}>{queueError}</Text> : null}
      </View>

      <View style={styles.metricRow}>
        <MetricTile label={t('scans.pending')} value={`${outputs.length}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('scans.capture')}</Text>
        <Text style={styles.detailText}>
          {browserViewingMode
            ? t('scans.captureWeb')
            : t('scans.captureNative')}
        </Text>

        <View style={styles.detailBlock}>
          {browserViewingMode ? (
            <>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => openSmartScanner()}
                disabled={captureLoading !== null}
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonLabel}>
                  {captureLoading === 'barcode' ? t('scans.lookingUpButton') : captureLoading === 'smart' ? t('scan.reading') : t('scan.scanner.title')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void captureWebPhoto('smart')}
                disabled={captureLoading !== null}
                accessibilityRole="button"
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>{t('common.takeFullPhoto')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>{t('scans.cameraScanner')}</Text>
                <Text style={styles.uploadSummaryDetail}>{t('scans.packageFront', { file: packageFileName ?? t('scans.notScanned') })}</Text>
                <Text style={styles.uploadSummaryDetail}>{t('scans.nutritionLabel', { file: labelFileName ?? t('scans.notScanned') })}</Text>
                <Text style={styles.uploadSummaryDetail}>{cameraReady}</Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void beginCapture()}
                disabled={captureLoading !== null}
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {packageFileName || labelFileName ? t('scans.openAgain') : t('scans.openScanner')}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {lastPackageScan ? (
          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>{t('scans.candidates')}</Text>
            {lastPackageScan.extraction.match_candidates.length > 0 ? (
              <View style={styles.list}>
                {lastPackageScan.extraction.match_candidates.map((candidate) => (
                  <View key={candidate.food_id} style={styles.listRow}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{candidate.name}</Text>
                      <Text style={styles.listCaption}>
                        {candidate.brand ?? t('scans.noBrand')} · {candidate.source}
                      </Text>
                    </View>
                    <Text style={styles.listMetric}>{Math.round(candidate.confidence * 100)}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.detailText}>{t('scans.noCandidates')}</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('nav.sections.recentScans')}</Text>
        {queueLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={tc.fg_17324d} />
            <Text style={styles.detailText}>{t('scans.loadingRecent')}</Text>
          </View>
        ) : pendingCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('scans.noRecent')}</Text>
            <Text style={styles.detailText}>{t('scans.noRecentDetail')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {recentScanGroups.map((group) => {
              const expanded = expandedScanDates[group.dateKey] ?? false;
              return (
                <View key={group.dateKey} style={styles.groupCard}>
                  <Pressable
                    style={styles.groupHeader}
                    onPress={() =>
                      setExpandedScanDates((current) => ({
                        ...current,
                        [group.dateKey]: !expanded
                      }))
                    }
                  >
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{group.label}</Text>
                      <Text style={styles.listCaption}>
                        {t('scans.scanCount', { count: group.items.length })}
                      </Text>
                    </View>
                    <Text style={styles.listMetric}>{expanded ? t('scans.hide') : t('scans.show')}</Text>
                  </Pressable>
                  {expanded ? (
                    <View style={styles.list}>
                      {group.items.map((output) => {
                        const active = output.id === selectedOutputId;
                        return (
                          <Pressable
                            key={output.id}
                            style={[styles.listRow, active && styles.listRowActive]}
                            onPress={() => {
                              setSelectedOutputId(output.id);
                              setSelectedOutput(output);
                              setSavedFoods([]);
                              setEditingFields(false);
                            }}
                          >
                            <View style={styles.listCopy}>
                              <Text style={styles.listTitle}>{describeOutput(output)}</Text>
                              <Text style={styles.listCaption}>
                                {t('scans.confidence', { time: formatCreatedAt(output.created_at, t.locale), percent: Math.round(output.confidence * 100) })}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('scans.detected')}</Text>
        {displayOutput ? (
          <View style={styles.detailStack}>
            <View style={styles.detailBlock}>
              <View style={styles.detailHeadingRow}>
                <View />
                {displayOutput.review_state === 'pending' ? (
                  <Pressable
                    style={[styles.actionButton, styles.secondaryButton, styles.inlineEditButton]}
                    onPress={() => setEditingFields((current) => !current)}
                  >
                    <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                      {editingFields ? t('common.done') : t('setup.review.edit')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.list}>
                <View style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{nutritionDraft.product_name || t('scans.unnamed')}</Text>
                    <Text style={styles.listCaption}>{nutritionDraft.brand_name || t('scans.noBrand')}</Text>
                    <Text style={styles.listCaption}>
                      {t('scans.servingCalories', {
                        serving: nutritionDraft.serving_size || t('scans.oneServing'),
                        calories: nutritionDraft.calories || '0'
                      })}
                    </Text>
                    <Text style={styles.listCaption}>
                      {t('scans.macroLine', {
                        protein: nutritionDraft.protein || '0',
                        carbs: nutritionDraft.carbs || '0',
                        fat: nutritionDraft.fat || '0'
                      })}
                    </Text>
                    {attributionFor(displayOutput.structured_json) ? (
                      <Text style={styles.listCaption}>{attributionFor(displayOutput.structured_json)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
              {(() => {
                const info = matchInfo(displayOutput.structured_json);
                if (displayOutput.review_state !== 'pending' || info.kind === null) {
                  return null;
                }
                return (
                  <View style={[styles.matchBanner, info.kind === 'missing' && styles.matchBannerMissing]}>
                    <Text style={styles.matchTitle}>{info.kind === 'match' ? t('scans.matched') : t('scans.noNutrition')}</Text>
                    <Text style={styles.detailText}>
                      {info.kind === 'match'
                        ? info.note ?? t('scans.matchedNote')
                        : t('scans.nothingMatched', { name: nutritionDraft.product_name || t('scan.thisProduct') })}
                    </Text>
                    {info.alternatives.length > 0 ? (
                      <View style={styles.matchChips}>
                        <Text style={styles.matchChipsLabel}>{t('scans.otherMatches')}</Text>
                        {info.alternatives.map((alternative, index) => (
                          <Pressable
                            key={`${describeAlternative(alternative)}-${index}`}
                            style={styles.matchChip}
                            onPress={() =>
                              setSelectedOutput({ ...displayOutput, structured_json: applyAlternative(displayOutput.structured_json, index) })
                            }
                            accessibilityRole="button"
                          >
                            <Text style={styles.matchChipLabel}>{describeAlternative(alternative)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {browserViewingMode ? (
                      <Pressable
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => openSmartScanner(displayOutput.id)}
                        disabled={captureLoading !== null}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                          {captureLoading === 'smart' ? t('scans.readingLabel') : t('scan.scanNutritionLabel')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })()}
              {editingFields ? (
                <View style={styles.formGrid}>
                  <LabeledInput
                    label={t('scans.fields.productName')}
                    value={nutritionDraft.product_name}
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'product_name', value)}
                  />
                  <LabeledInput
                    label={t('scans.fields.brand')}
                    value={nutritionDraft.brand_name}
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'brand_name', value)}
                  />
                  <LabeledInput
                    label={t('scans.fields.servingSize')}
                    value={nutritionDraft.serving_size}
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'serving_size', value)}
                  />
                  <LabeledInput
                    label={t('scans.fields.calories')}
                    value={nutritionDraft.calories}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'calories', value)}
                  />
                  <LabeledInput
                    label={t('macros.protein')}
                    value={nutritionDraft.protein}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'protein', value)}
                  />
                  <LabeledInput
                    label={t('macros.carbs')}
                    value={nutritionDraft.carbs}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'carbs', value)}
                  />
                  <LabeledInput
                    label={t('macros.fat')}
                    value={nutritionDraft.fat}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'fat', value)}
                  />
                </View>
              ) : null}
              {hasAdditionalVariants ? (
                <View style={styles.detailBlock}>
                  <View style={styles.list}>
                    {nutritionVariants.map((variant) => (
                      <View key={variant.variant_name} style={styles.listRow}>
                        <View style={styles.listCopy}>
                          <Text style={styles.listTitle}>{variant.variant_name}</Text>
                          <Text style={styles.listCaption}>{nutritionDraft.brand_name || t('scans.noBrand')}</Text>
                          <Text style={styles.listCaption}>
                            {t('scans.servingCalories', { serving: variant.serving_size, calories: variant.calories })}
                          </Text>
                          <Text style={styles.listCaption}>{t('scans.macroLine', { ...variant.macros })}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {displayOutput.review_state === 'pending' ? (
                <Text style={styles.detailNote}>
                  {hasAdditionalVariants
                    ? t('scans.variantsNote')
                    : !hasValidNutritionDraft(nutritionDraft)
                      ? t('scans.needFields')
                      : t('scans.checkNumbers')}
                </Text>
              ) : null}
            </View>

            {savedFoods.length > 0 ? (
              <View style={styles.savedFoodBanner}>
                <Text style={styles.savedFoodTitle}>{savedFoods.length === 1 ? t('scans.savedFood') : t('scans.savedFoods')}</Text>
                {savedFoods.map((food) => (
                  <Text key={food.id} style={styles.detailText}>
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ''} · {t('scans.perServing', { kcal: Math.round(food.calories) })}
                  </Text>
                ))}
                {accessToken ? (
                  <Pressable style={[styles.actionButton, styles.saveButton]} onPress={() => setAddSheetOpen(true)} accessibilityRole="button">
                    <Text style={styles.actionButtonLabel}>{t('day.addToToday')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {displayOutput.review_state === 'pending' ? (
                <>
                  <Pressable
                    style={[styles.actionButton, styles.acceptButton, !canReview && styles.actionButtonDisabled]}
                    onPress={() => void saveScan()}
                    disabled={!canReview}
                    accessibilityRole="button"
                  >
                    <Text style={styles.actionButtonLabel}>{actioningId === displayOutput.id ? t('common.saving') : t('common.save')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => void reviewOutput(displayOutput.id, 'reject')}
                    disabled={actioningId === displayOutput.id}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.actionButtonLabel, styles.rejectButtonLabel]}>{t('scans.discard')}</Text>
                  </Pressable>
                </>
              ) : null}

              {displayOutput.review_state === 'accepted' && savedFoods.length === 0 ? (
                <Pressable
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => void saveSelectedFood()}
                  disabled={savingFoodId === displayOutput.id}
                >
                  <Text style={styles.actionButtonLabel}>
                    {savingFoodId === displayOutput.id ? t('common.saving') : t('common.save')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('scans.selectItem')}</Text>
            <Text style={styles.detailText}>{t('scans.selectItemDetail')}</Text>
          </View>
        )}
      </View>

      {addSheetOpen && accessToken && savedFoods.length > 0 ? (
        <AddFoodSheet
          foods={savedFoods}
          fromBank
          accessToken={accessToken}
          logDate={todayDateKey()}
          dayName="today"
          onClose={() => setAddSheetOpen(false)}
          onAdded={(food) => {
            setAddSheetOpen(false);
            setTone('live');
            setStatusLabel(t('scans.status.added'));
            setStatusDetail(t('scans.status.addedDetail', { name: food.name }));
            onFoodLogged?.();
          }}
        />
      ) : null}

      {browserViewingMode ? (
        <WebBarcodeScanner
          visible={barcodeScannerOpen}
          onCode={(code) => void lookUpScannedBarcode(code)}
          labelOnly={smartLabelOnly}
          onCapture={(frame) => {
            setBarcodeScannerOpen(false);
            const replace = smartReplaceRef.current;
            smartReplaceRef.current = null;
            void readSmartImage(frame, replace);
          }}
          onClose={() => {
            smartReplaceRef.current = null;
            setBarcodeScannerOpen(false);
          }}
          onTakePhoto={() => {
            setBarcodeScannerOpen(false);
            const replace = smartReplaceRef.current;
            smartReplaceRef.current = null;
            void captureWebPhoto('smart', replace ?? undefined);
          }}
        />
      ) : null}

      <Modal visible={cameraStep !== null} animationType="slide" onRequestClose={() => setCameraStep(null)}>
        <View style={styles.cameraModal}>
          <View style={styles.cameraHeader}>
            <View style={styles.cameraHeaderCopy}>
              <Text style={styles.cameraEyebrow}>{cameraStep === 'package' ? t('scans.camera.packageScan') : t('scans.camera.labelScan')}</Text>
              <Text style={styles.cameraTitle}>
                {cameraStep === 'package' ? t('scans.camera.framePackage') : t('scans.camera.frameLabel')}
              </Text>
              <Text style={styles.cameraDetail}>
                {cameraStep === 'package'
                  ? t('scans.camera.packageHint')
                  : t('scans.camera.labelHint')}
              </Text>
            </View>
            <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => setCameraStep(null)}>
              <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>{t('common.close')}</Text>
            </Pressable>
          </View>
          <View style={styles.cameraPreviewShell}>
            <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" mode="picture" />
            <View style={styles.cameraGuide} pointerEvents="none">
              <Animated.View
                style={[
                  styles.cameraGuideFrame,
                  {
                    borderColor: guideBorderColor
                  }
                ]}
              />
            </View>
          </View>
          <View style={styles.cameraActionRow}>
            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => void captureFromCamera()}
              disabled={captureLoading !== null}
            >
              <Text style={styles.actionButtonLabel}>
                {captureLoading === cameraStep
                  ? t('scans.camera.scanning')
                  : cameraStep === 'package'
                    ? t('scans.camera.scanPackage')
                    : t('scans.camera.scanLabel')}
              </Text>
            </Pressable>
            {cameraStep === 'label' ? (
              <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={skipLabelCapture}>
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>{t('scans.camera.skipLabel')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function buildPendingOutput(outputId: string, ingestionJobId: string, confidence: number, extraction: unknown): IngestionOutput {
  return {
    id: outputId,
    ingestion_job_id: ingestionJobId,
    extracted_text: null,
    structured_json: extraction,
    confidence,
    reviewed_at: null,
    accepted_at: null,
    rejected_at: null,
    created_at: new Date().toISOString(),
    review_state: 'pending'
  };
}

/** "Data from Open Food Facts (ODbL)" and similar, for results that came from a food database. */
function attributionFor(structuredJson: unknown): string | null {
  if (typeof structuredJson !== 'object' || structuredJson === null) {
    return null;
  }
  const attribution = (structuredJson as { attribution?: unknown }).attribution;
  return typeof attribution === 'string' && attribution.trim() ? attribution : null;
}

function hasValidNutritionDraft(draft: EditableNutritionDraft): boolean {
  if (draft.product_name.trim().length === 0 || draft.serving_size.trim().length === 0) {
    return false;
  }

  return [draft.calories, draft.protein, draft.carbs, draft.fat].every((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  });
}

function updateDraft(
  setDraft: Dispatch<SetStateAction<EditableNutritionDraft>>,
  key: keyof EditableNutritionDraft,
  value: string
) {
  setDraft((current) => ({ ...current, [key]: value }));
}

function toneColor(tone: SyncTone): string {
  if (tone === 'live') {
    return tc.line_0f766e;
  }
  return tc.line_1d4ed8;
}

function groupOutputsByDate(outputs: IngestionOutput[], t: TFunction): Array<{
  dateKey: string;
  label: string;
  items: IngestionOutput[];
}> {
  const groups = new Map<string, IngestionOutput[]>();
  for (const output of outputs) {
    const dateKey = localDateKeyForTimestamp(output.created_at);
    const items = groups.get(dateKey) ?? [];
    items.push(output);
    groups.set(dateKey, items);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateKey, items]) => ({
      dateKey,
      label: formatScanGroupLabel(dateKey, t),
      items: items.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }));
}

function formatScanGroupLabel(dateKey: string, t: TFunction): string {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const todayKey = localDateKey();
  if (dateKey === todayKey) {
    return t('trends.today');
  }

  if (dateKey === addDaysToDateKey(todayKey, -1)) {
    return t('trends.yesterday');
  }

  return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' }, t.locale);
}

function runGuidePulse(value: Animated.Value): Promise<void> {
  value.stopAnimation();
  value.setValue(0);
  return new Promise((resolve) => {
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false
      }),
      Animated.timing(value, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false
      })
    ]).start(() => resolve());
  });
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.textInput}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: tc.bg_fffdf8,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: tc.line_e6dccc
  },
  eyebrow: {
    color: tc.fg_7a4e16,
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: tc.fg_132536,
    fontSize: 24,
    fontWeight: '800'
  },
  detail: {
    color: tc.fg_5c6d80,
    fontSize: 14,
    lineHeight: 20
  },
  statusBanner: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    backgroundColor: tc.bg_fffaf0
  },
  statusLabel: {
    color: tc.fg_132536,
    fontWeight: '800'
  },
  statusDetail: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    lineHeight: 18
  },
  errorText: {
    color: tc.fg_b42318,
    fontSize: 13,
    lineHeight: 18
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  metricTile: {
    flexGrow: 1,
    flexBasis: 100,
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 16,
    padding: 12,
    gap: 4
  },
  metricLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: tc.fg_132536,
    fontSize: 18,
    fontWeight: '800'
  },
  card: {
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 20,
    padding: 14,
    gap: 10
  },
  cardLabel: {
    color: tc.fg_7a4e16,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  list: {
    gap: 8
  },
  groupCard: {
    gap: 8,
    backgroundColor: tc.bg_fffaf0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_e4dccf,
    padding: 10
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  listRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tc.line_e2e8f0,
    backgroundColor: tc.bg_ffffff,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  listRowActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  listCopy: {
    flex: 1,
    gap: 4
  },
  listTitle: {
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '800'
  },
  listCaption: {
    color: tc.fg_6b7b90,
    fontSize: 12
  },
  listMetric: {
    color: tc.fg_17324d,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  loadingState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18
  },
  emptyState: {
    paddingVertical: 12,
    gap: 6
  },
  emptyTitle: {
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '800'
  },
  detailStack: {
    gap: 12
  },
  detailHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  detailBlock: {
    gap: 6
  },
  detailBlockLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  detailText: {
    color: tc.fg_132536,
    fontSize: 13,
    lineHeight: 18
  },
  uploadSummaryCard: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.line_d8e1eb,
    padding: 12,
    gap: 4
  },
  uploadSummaryTitle: {
    color: tc.fg_132536,
    fontSize: 13,
    fontWeight: '800'
  },
  uploadSummaryDetail: {
    color: tc.fg_66778c,
    fontSize: 12,
    lineHeight: 18
  },
  detailNote: {
    color: tc.fg_7a4e16,
    fontSize: 12,
    lineHeight: 18
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1
  },
  inlineEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  actionButtonDisabled: {
    opacity: 0.45
  },
  acceptButton: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  rejectButton: {
    backgroundColor: tc.bg_fff4f0,
    borderColor: tc.line_f2c8be
  },
  saveButton: {
    backgroundColor: tc.bg_0f766e,
    borderColor: tc.line_0f766e
  },
  secondaryButton: {
    backgroundColor: tc.bg_ffffff,
    borderColor: tc.line_d7dee7
  },
  actionButtonLabel: {
    color: tc.fg_ffffff,
    fontSize: 13,
    fontWeight: '800'
  },
  secondaryButtonLabel: {
    color: tc.fg_17324d
  },
  cameraModal: {
    flex: 1,
    backgroundColor: '#0f1720',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    gap: 16
  },
  cameraHeader: {
    gap: 12
  },
  cameraHeaderCopy: {
    gap: 4
  },
  cameraEyebrow: {
    color: '#c4f1df',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  cameraTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800'
  },
  cameraDetail: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20
  },
  cameraPreviewShell: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000'
  },
  cameraPreview: {
    flex: 1
  },
  cameraGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraGuideFrame: {
    position: 'absolute',
    width: '78%',
    aspectRatio: 0.72,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'transparent'
  },
  cameraActionRow: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  rejectButtonLabel: {
    color: tc.fg_8a3328
  },
  formGrid: {
    gap: 10
  },
  inputGroup: {
    gap: 4
  },
  inputLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700'
  },
  textInput: {
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d8e1eb,
    paddingHorizontal: 12,
    paddingVertical: 10,
    // 16 px or more: iOS Safari zooms the page into smaller text fields on focus.
    fontSize: 16
  },
  matchBanner: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: tc.bg_fff8ea,
    borderWidth: 1,
    borderColor: tc.line_f59e0b
  },
  matchBannerMissing: { backgroundColor: tc.bg_fff4f0, borderColor: tc.line_f2c8be },
  matchTitle: { color: tc.fg_7a4e16, fontSize: 14, fontWeight: '800' },
  matchChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  matchChipsLabel: { color: tc.fg_5c6d80, fontSize: 13, width: '100%' },
  matchChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7, backgroundColor: tc.bg_ffffff },
  matchChipLabel: { color: tc.fg_132536, fontSize: 13, fontWeight: '600' },
  savedFoodBanner: {
    backgroundColor: tc.bg_ecfdf3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.line_a7f3d0,
    padding: 12,
    gap: 4
  },
  savedFoodTitle: {
    color: tc.fg_065f46,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  }
});
