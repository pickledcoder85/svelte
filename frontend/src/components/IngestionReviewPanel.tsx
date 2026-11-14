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
  scanFoodPackage
} from '../lib/api';
import type { FoodItem, IngestionOutput, VisionPackageScanResult } from '../types';
import {
  buildAcceptedNutritionPayload,
  buildNutritionDraft,
  describeOutput,
  formatCreatedAt,
  formatStructuredJson,
  getNutritionVariants,
  pendingOutputs,
  type EditableNutritionDraft
} from './ingestionReviewHelpers';
import { WebBarcodeScanner } from './WebBarcodeScanner';

interface IngestionReviewPanelProps {
  accessToken: string | null;
}

type SyncTone = 'checking' | 'live';

export function IngestionReviewPanel({ accessToken }: IngestionReviewPanelProps) {
  const cameraRef = useRef<CameraView | null>(null);
  const guidePulse = useRef(new Animated.Value(0)).current;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [outputs, setOutputs] = useState<IngestionOutput[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<IngestionOutput | null>(null);
  const [tone, setTone] = useState<SyncTone>('checking');
  const [statusLabel, setStatusLabel] = useState('Loading pending outputs');
  const [statusDetail, setStatusDetail] = useState('Fetching the ingestion review queue.');
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [packageBase64, setPackageBase64] = useState('');
  const [labelBase64, setLabelBase64] = useState('');
  const [packageFileName, setPackageFileName] = useState<string | null>(null);
  const [labelFileName, setLabelFileName] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState<'package' | 'label' | 'barcode' | null>(null);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [cameraStep, setCameraStep] = useState<'package' | 'label' | null>(null);
  const [lastPackageScan, setLastPackageScan] = useState<VisionPackageScanResult | null>(null);
  const [savedFoods, setSavedFoods] = useState<FoodItem[]>([]);
  const [savingFoodId, setSavingFoodId] = useState<string | null>(null);
  const [nutritionDraft, setNutritionDraft] = useState<EditableNutritionDraft>(() => buildNutritionDraft(null));
  const [editingFields, setEditingFields] = useState(false);
  const [expandedScanDates, setExpandedScanDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setNutritionDraft(buildNutritionDraft(selectedOutput?.structured_json));
    setEditingFields(false);
  }, [selectedOutput]);

  useEffect(() => {
    const groups = groupOutputsByDate(outputs);
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
    setStatusLabel('Loading pending outputs');
    setStatusDetail('Fetching the ingestion review queue.');

    if (!accessToken) {
      if (cancelled) {
        return;
      }

      setOutputs([]);
      setSelectedOutputId(null);
      setSelectedOutput(null);
      setTone('checking');
      setStatusLabel('Sign in to review ingestion outputs');
      setStatusDetail('The ingestion queue loads from the live backend session.');
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
      setStatusLabel('Live ingestion queue');
      setStatusDetail(
        pending.length === 0
          ? 'No pending outputs right now.'
          : `${pending.length} pending output${pending.length === 1 ? '' : 's'} ready for review.`
      );
    } catch (error) {
      if (cancelled) {
        return;
      }

      setOutputs([]);
      setSelectedOutputId(null);
      setSelectedOutput(null);
      setTone('checking');
      setStatusLabel('Live ingestion queue unavailable');
      setStatusDetail('The backend queue is unavailable right now.');
      setQueueError(error instanceof Error ? error.message : 'Ingestion queue unavailable.');
    } finally {
      if (!cancelled) {
        setQueueLoading(false);
      }
    }
  }

  async function createPackageScan() {
    await createPackageScanFromBase64(packageBase64.trim());
  }

  async function createPackageScanFromBase64(imageBase64: string) {
    if (!accessToken || captureLoading || imageBase64.length === 0) {
      return;
    }

    setCaptureLoading('package');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel('Scanning package front');
    setStatusDetail('Creating a package-ingestion output from the provided image payload.');

    try {
      const scan = await scanFoodPackage(imageBase64, accessToken);
      const output = buildPendingOutput(scan.output_id, scan.ingestion_job_id, scan.confidence, scan.extraction);
      setLastPackageScan(scan);
      setSelectedOutputId(output.id);
      setSelectedOutput(output);
      await refreshQueue();
      setTone('live');
      setStatusLabel('Package scan created');
      setStatusDetail(
        scan.extraction.match_candidates.length > 0
          ? `${scan.extraction.match_candidates.length} candidate match${
              scan.extraction.match_candidates.length === 1 ? '' : 'es'
            } ready for review.`
          : 'Package scan created without confident existing-food candidates.'
      );
    } catch (error) {
      setTone('checking');
      setStatusLabel('Package scan failed');
      setStatusDetail('The package image could not be analyzed.');
      setQueueError(error instanceof Error ? error.message : 'Package scan failed.');
    } finally {
      setCaptureLoading(null);
    }
  }

  async function createLabelScan() {
    await createLabelScanFromBase64(labelBase64.trim());
  }

  async function createLabelScanFromBase64(imageBase64: string) {
    if (!accessToken || captureLoading || imageBase64.length === 0) {
      return;
    }

    setCaptureLoading('label');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel('Scanning nutrition label');
    setStatusDetail('Creating a label-ingestion output from the provided image payload.');

    try {
      const scan = await ingestNutritionLabel(imageBase64, accessToken);
      const output = buildPendingOutput(scan.output_id, scan.ingestion_job_id, scan.confidence, scan.extraction);
      setSelectedOutputId(output.id);
      setSelectedOutput(output);
      await refreshQueue();
      setTone('live');
      setStatusLabel('Label scan created');
      setStatusDetail('The extracted nutrition draft is ready for review and acceptance.');
    } catch (error) {
      setTone('checking');
      setStatusLabel('Label scan failed');
      setStatusDetail('The label image could not be analyzed.');
      setQueueError(error instanceof Error ? error.message : 'Label scan failed.');
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
    setStatusLabel(action === 'accept' ? 'Accepting output' : 'Rejecting output');
    setStatusDetail('Saving the review decision.');

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
      setStatusLabel(action === 'accept' ? 'Output accepted' : 'Output rejected');
      setStatusDetail(describeOutput(reviewed));
    } catch (error) {
      setTone('checking');
      setStatusLabel('Review action failed');
      setStatusDetail('The selected output could not be updated.');
      setQueueError(error instanceof Error ? error.message : 'Unable to update ingestion review.');
    } finally {
      setActioningId(null);
    }
  }

  async function saveSelectedFood() {
    if (!accessToken || !selectedOutput || selectedOutput.review_state !== 'accepted' || savingFoodId) {
      return;
    }

    setSavingFoodId(selectedOutput.id);
    setQueueError(null);
    setTone('checking');
    setStatusLabel('Saving food item');
    setStatusDetail('Persisting the accepted ingestion output into the food catalog.');

    try {
      const result = await saveFoodFromIngestionOutput(selectedOutput.id, accessToken);
      setSavedFoods(result.saved_foods);
      setTone('live');
      setStatusLabel(result.saved_foods.length === 1 ? 'Food saved' : 'Foods saved');
      setStatusDetail(
        result.saved_foods.length === 1
          ? `${result.saved_foods[0].name} is now available in the food catalog.`
          : `${result.saved_foods.length} foods are now available in the food catalog.`
      );
    } catch (error) {
      setTone('checking');
      setStatusLabel('Food save failed');
      setStatusDetail('The accepted output could not be saved as a food item.');
      setQueueError(error instanceof Error ? error.message : 'Unable to save food item.');
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
      setQueueError('Camera permission is required to scan packages and labels.');
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
        throw new Error('Camera capture did not return image data.');
      }

      if (activeStep === 'package') {
        setPackageBase64(base64);
        setPackageFileName(`live-package-${Date.now()}.jpg`);
        await createPackageScanFromBase64(base64);
        await runGuidePulse(guidePulse);
        setCameraStep('label');
        setStatusLabel('Package scan created');
        setStatusDetail('Scan the nutrition label next, or skip if the product does not show one.');
      } else {
        setLabelBase64(base64);
        setLabelFileName(`live-label-${Date.now()}.jpg`);
        await createLabelScanFromBase64(base64);
        await runGuidePulse(guidePulse);
        setCameraStep(null);
      }
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Unable to capture image from camera.');
    } finally {
      if (activeStep !== 'package') {
        setCameraStep(null);
      }
    }
  }

  async function captureWebPhoto(step: 'package' | 'label') {
    if (captureLoading || !accessToken) {
      if (!accessToken) {
        setQueueError('Sign in before scanning.');
      }
      return;
    }
    setQueueError(null);
    // Open the camera synchronously inside the tap: iOS only allows it from a user gesture.
    const file = await pickPhotoFromCamera();
    if (!file) {
      return;
    }

    let prepared: PreparedPhoto;
    try {
      setTone('checking');
      setStatusLabel('Preparing photo');
      setStatusDetail('Shrinking the photo before upload.');
      prepared = await prepareScanPhoto(file);
    } catch (error) {
      setTone('checking');
      setStatusLabel('Photo not usable');
      setStatusDetail('Take the photo again.');
      setQueueError(error instanceof Error ? error.message : 'This photo could not be prepared.');
      return;
    }

    const fileName = `${step}-${Date.now()}.jpg`;
    if (step === 'package') {
      setPackageBase64(prepared.base64);
      setPackageFileName(fileName);
      await createPackageScanFromBase64(prepared.base64);
    } else {
      setLabelBase64(prepared.base64);
      setLabelFileName(fileName);
      await createLabelScanFromBase64(prepared.base64);
    }
  }

  function openBarcodeScanner() {
    if (captureLoading) {
      return;
    }
    if (!accessToken) {
      setQueueError('Sign in before scanning.');
      return;
    }
    setQueueError(null);
    setBarcodeScannerOpen(true);
  }

  async function lookUpScannedBarcode(code: string) {
    setBarcodeScannerOpen(false);
    if (!accessToken) {
      return;
    }
    setCaptureLoading('barcode');
    setQueueError(null);
    setSavedFoods([]);
    setTone('checking');
    setStatusLabel('Looking up barcode');
    setStatusDetail(`Checking ${code} in your food bank and Open Food Facts.`);

    try {
      const result = await lookupBarcode(code, accessToken);
      if (result.food) {
        setSavedFoods([result.food]);
        setTone('live');
        setStatusLabel('Already in your food bank');
        setStatusDetail(`${result.food.name} is saved. Find it in Foods to log it.`);
      } else if (result.output) {
        const output = result.output;
        setSelectedOutputId(output.id);
        setSelectedOutput(output);
        await refreshQueue();
        setTone('live');
        setStatusLabel('Barcode found');
        setStatusDetail(
          `${describeOutput(output)} from ${result.source === 'usda' ? 'USDA' : 'Open Food Facts'}. Check the numbers, then accept and save.`
        );
      } else {
        setTone('checking');
        setStatusLabel('Barcode not found');
        setStatusDetail(result.message ?? "We couldn't find this barcode. Photograph the nutrition label instead.");
      }
    } catch (error) {
      setTone('checking');
      setStatusLabel('Barcode lookup failed');
      setStatusDetail('Try again, or photograph the nutrition label instead.');
      setQueueError(error instanceof Error ? error.message : 'Barcode lookup failed.');
    } finally {
      setCaptureLoading(null);
    }
  }

  function skipLabelCapture() {
    setCameraStep(null);
    setTone('live');
    setStatusLabel('Package scan ready');
    setStatusDetail('Nutrition label skipped. Review the package result and save when ready.');
  }

  const displayOutput = selectedOutput;
  const pendingCount = outputs.length;
  const recentScanGroups = groupOutputsByDate(outputs);
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
      ? 'Camera ready for live scanning.'
      : 'Open the live scanner and grant camera access to capture the current frame.');
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
      <Text style={styles.eyebrow}>Ingestion</Text>
      <Text style={styles.title}>Camera food bank</Text>
      <Text style={styles.detail}>
        Photograph a package front or a nutrition label, then review and save the extracted food data.
      </Text>

      <View style={[styles.statusBanner, { borderColor: toneColor(tone) }]}>
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.statusDetail}>{statusDetail}</Text>
        {queueError ? <Text style={styles.errorText}>{queueError}</Text> : null}
      </View>

      <View style={styles.metricRow}>
        <MetricTile label="Pending" value={`${outputs.length}`} />
        <MetricTile label="Session" value={accessToken ? 'Live' : 'Sign in required'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Capture</Text>
        <Text style={styles.detailText}>
          {browserViewingMode
            ? 'Scan the barcode first. If it is not found, photograph the nutrition label or package front.'
            : 'Open the camera once, scan the package front, then scan the nutrition label or skip it if the product does not show one.'}
        </Text>

        <View style={styles.detailBlock}>
          {browserViewingMode ? (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>Camera</Text>
                <Text style={styles.uploadSummaryDetail}>
                  Package front: {packageFileName ? 'photographed' : 'not yet'}
                </Text>
                <Text style={styles.uploadSummaryDetail}>
                  Nutrition label: {labelFileName ? 'photographed' : 'not yet'}
                </Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={openBarcodeScanner}
                disabled={captureLoading !== null}
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonLabel}>
                  {captureLoading === 'barcode' ? 'Looking up barcode…' : 'Scan barcode'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void captureWebPhoto('package')}
                disabled={captureLoading !== null}
                accessibilityRole="button"
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {captureLoading === 'package' ? 'Scanning package…' : 'Photograph package front'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void captureWebPhoto('label')}
                disabled={captureLoading !== null}
                accessibilityRole="button"
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {captureLoading === 'label' ? 'Scanning label…' : 'Photograph nutrition label'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>Camera scanner</Text>
                <Text style={styles.uploadSummaryDetail}>
                  Package front: {packageFileName ?? 'not scanned yet'}
                </Text>
                <Text style={styles.uploadSummaryDetail}>
                  Nutrition label: {labelFileName ?? 'not scanned yet'}
                </Text>
                <Text style={styles.uploadSummaryDetail}>{cameraReady}</Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void beginCapture()}
                disabled={captureLoading !== null}
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {packageFileName || labelFileName ? 'Open Camera Again' : 'Open Camera Scanner'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {lastPackageScan ? (
          <View style={styles.detailBlock}>
            <Text style={styles.detailBlockLabel}>Package match candidates</Text>
            {lastPackageScan.extraction.match_candidates.length > 0 ? (
              <View style={styles.list}>
                {lastPackageScan.extraction.match_candidates.map((candidate) => (
                  <View key={candidate.food_id} style={styles.listRow}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{candidate.name}</Text>
                      <Text style={styles.listCaption}>
                        {candidate.brand ?? 'No brand'} · {candidate.source}
                      </Text>
                    </View>
                    <Text style={styles.listMetric}>{Math.round(candidate.confidence * 100)}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.detailText}>No existing-food matches returned from the current package scan.</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recent scans</Text>
        {queueLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#17324d" />
            <Text style={styles.detailText}>Loading recent scans...</Text>
          </View>
        ) : pendingCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No recent scans</Text>
            <Text style={styles.detailText}>
              New package or label scans will appear here for quick review.
            </Text>
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
                        {group.items.length} scan{group.items.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={styles.listMetric}>{expanded ? 'Hide' : 'Show'}</Text>
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
                                {formatCreatedAt(output.created_at)} · {Math.round(output.confidence * 100)}% confidence
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
        <Text style={styles.cardLabel}>Detected result</Text>
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
                      {editingFields ? 'Done Editing' : 'Edit'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.list}>
                <View style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{nutritionDraft.product_name || 'Unnamed product'}</Text>
                    <Text style={styles.listCaption}>
                      {nutritionDraft.brand_name || 'No brand'}
                    </Text>
                    <Text style={styles.listCaption}>
                      {nutritionDraft.serving_size || '1 serving'} · {nutritionDraft.calories || '0'} cal
                    </Text>
                    <Text style={styles.listCaption}>
                      Protein {nutritionDraft.protein || '0'}g · Carbs {nutritionDraft.carbs || '0'}g · Fat {nutritionDraft.fat || '0'}g · Fiber —
                    </Text>
                    {attributionFor(displayOutput.structured_json) ? (
                      <Text style={styles.listCaption}>{attributionFor(displayOutput.structured_json)}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
              {editingFields ? (
                <View style={styles.formGrid}>
                  <LabeledInput
                    label="Product name"
                    value={nutritionDraft.product_name}
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'product_name', value)}
                  />
                  <LabeledInput
                    label="Brand"
                    value={nutritionDraft.brand_name}
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'brand_name', value)}
                  />
                  <LabeledInput
                    label="Serving size"
                    value={nutritionDraft.serving_size}
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'serving_size', value)}
                  />
                  <LabeledInput
                    label="Calories"
                    value={nutritionDraft.calories}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'calories', value)}
                  />
                  <LabeledInput
                    label="Protein"
                    value={nutritionDraft.protein}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'protein', value)}
                  />
                  <LabeledInput
                    label="Carbs"
                    value={nutritionDraft.carbs}
                    keyboardType="numeric"
                    onChangeText={(value) => updateDraft(setNutritionDraft, 'carbs', value)}
                  />
                  <LabeledInput
                    label="Fat"
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
                          <Text style={styles.listCaption}>
                            {nutritionDraft.brand_name || 'No brand'}
                          </Text>
                          <Text style={styles.listCaption}>
                            {variant.serving_size} · {variant.calories} cal
                          </Text>
                          <Text style={styles.listCaption}>
                            Protein {variant.macros.protein}g · Carbs {variant.macros.carbs}g · Fat {variant.macros.fat}g · Fiber —
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {displayOutput.review_state === 'pending' ? (
                <Text style={styles.detailNote}>
                  {hasAdditionalVariants
                    ? 'Accepting this scan will preserve the full variants list and save one food per variant.'
                    : editingFields
                      ? 'Edit the extracted nutrition values before accepting. Save-to-food becomes available after acceptance.'
                      : 'Review the detected result, then accept it. Edit only if the scan needs correction before save.'}
                </Text>
              ) : null}
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Structured JSON</Text>
              <Text style={styles.codeBlock}>{formatStructuredJson(displayOutput.structured_json)}</Text>
            </View>

            {savedFoods.length > 0 ? (
              <View style={styles.savedFoodBanner}>
                <Text style={styles.savedFoodTitle}>{savedFoods.length === 1 ? 'Saved food' : 'Saved foods'}</Text>
                {savedFoods.map((food) => (
                  <Text key={food.id} style={styles.detailText}>
                    {food.name} · {food.brand ?? 'No brand'} · {food.source}
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {displayOutput.review_state === 'pending' ? (
                <>
                  <Pressable
                    style={[styles.actionButton, styles.acceptButton, !canReview && styles.actionButtonDisabled]}
                    onPress={() => void reviewOutput(displayOutput.id, 'accept')}
                    disabled={!canReview}
                  >
                    <Text style={styles.actionButtonLabel}>
                      {actioningId === displayOutput.id ? 'Saving...' : 'Accept With Edits'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => void reviewOutput(displayOutput.id, 'reject')}
                    disabled={actioningId === displayOutput.id}
                  >
                    <Text style={[styles.actionButtonLabel, styles.rejectButtonLabel]}>
                      {actioningId === displayOutput.id ? 'Saving...' : 'Reject'}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {displayOutput.review_state === 'accepted' ? (
                <Pressable
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => void saveSelectedFood()}
                  disabled={savingFoodId === displayOutput.id}
                >
                  <Text style={styles.actionButtonLabel}>
                    {savingFoodId === displayOutput.id ? 'Saving...' : 'Save As Food'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Select a review item</Text>
            <Text style={styles.detailText}>The selected item will appear here for editing and save actions.</Text>
          </View>
        )}
      </View>

      {browserViewingMode ? (
        <WebBarcodeScanner
          visible={barcodeScannerOpen}
          onCode={(code) => void lookUpScannedBarcode(code)}
          onClose={() => setBarcodeScannerOpen(false)}
          onTakePhoto={() => {
            setBarcodeScannerOpen(false);
            void captureWebPhoto('label');
          }}
        />
      ) : null}

      <Modal visible={cameraStep !== null} animationType="slide" onRequestClose={() => setCameraStep(null)}>
        <View style={styles.cameraModal}>
          <View style={styles.cameraHeader}>
            <View style={styles.cameraHeaderCopy}>
              <Text style={styles.cameraEyebrow}>{cameraStep === 'package' ? 'Package scan' : 'Label scan'}</Text>
              <Text style={styles.cameraTitle}>
                {cameraStep === 'package' ? 'Frame the package front' : 'Frame the nutrition label'}
              </Text>
              <Text style={styles.cameraDetail}>
                {cameraStep === 'package'
                  ? 'Start with the front of the package. After this scan, the camera will advance to the nutrition label step.'
                  : 'Now scan the nutrition label, or skip this step if the product does not show one.'}
              </Text>
            </View>
            <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => setCameraStep(null)}>
              <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Close</Text>
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
                  ? 'Scanning...'
                  : cameraStep === 'package'
                    ? 'Scan Package Front'
                    : 'Scan Nutrition Label'}
              </Text>
            </Pressable>
            {cameraStep === 'label' ? (
              <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={skipLabelCapture}>
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Skip Label</Text>
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
    return '#0f766e';
  }
  return '#1d4ed8';
}

function groupOutputsByDate(outputs: IngestionOutput[]): Array<{
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
      label: formatScanGroupLabel(dateKey),
      items: items.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }));
}

function formatScanGroupLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const todayKey = localDateKey();
  if (dateKey === todayKey) {
    return 'Today';
  }

  if (dateKey === addDaysToDateKey(todayKey, -1)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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
    backgroundColor: '#fffdf8',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e6dccc'
  },
  eyebrow: {
    color: '#7a4e16',
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  title: {
    color: '#132536',
    fontSize: 24,
    fontWeight: '800'
  },
  detail: {
    color: '#5c6d80',
    fontSize: 14,
    lineHeight: 20
  },
  statusBanner: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    backgroundColor: '#fffaf0'
  },
  statusLabel: {
    color: '#132536',
    fontWeight: '800'
  },
  statusDetail: {
    color: '#5c6d80',
    fontSize: 13,
    lineHeight: 18
  },
  errorText: {
    color: '#b42318',
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
    backgroundColor: '#f7f4ef',
    borderRadius: 16,
    padding: 12,
    gap: 4
  },
  metricLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: '#132536',
    fontSize: 18,
    fontWeight: '800'
  },
  card: {
    backgroundColor: '#f7f4ef',
    borderRadius: 20,
    padding: 14,
    gap: 10
  },
  cardLabel: {
    color: '#7a4e16',
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
    backgroundColor: '#fffaf0',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e4dccf',
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
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  listRowActive: {
    borderColor: '#17324d',
    backgroundColor: '#eef3f8'
  },
  listCopy: {
    flex: 1,
    gap: 4
  },
  listTitle: {
    color: '#132536',
    fontSize: 15,
    fontWeight: '800'
  },
  listCaption: {
    color: '#6b7b90',
    fontSize: 12
  },
  listMetric: {
    color: '#17324d',
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
    color: '#132536',
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
  detailHeadingCopy: {
    flex: 1,
    gap: 4
  },
  detailTitle: {
    color: '#132536',
    fontSize: 18,
    fontWeight: '800'
  },
  detailSubtitle: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 18
  },
  stateChip: {
    borderRadius: 999,
    backgroundColor: '#17324d',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  stateChipLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  detailBlock: {
    gap: 6
  },
  detailBlockLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  detailText: {
    color: '#132536',
    fontSize: 13,
    lineHeight: 18
  },
  codeBlock: {
    color: '#132536',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12
  },
  inputBlock: {
    minHeight: 86,
    textAlignVertical: 'top'
  },
  uploadSummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8e1eb',
    padding: 12,
    gap: 4
  },
  uploadSummaryTitle: {
    color: '#132536',
    fontSize: 13,
    fontWeight: '800'
  },
  uploadSummaryDetail: {
    color: '#66778c',
    fontSize: 12,
    lineHeight: 18
  },
  detailNote: {
    color: '#7a4e16',
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
    backgroundColor: '#17324d',
    borderColor: '#17324d'
  },
  rejectButton: {
    backgroundColor: '#fff4f0',
    borderColor: '#f2c8be'
  },
  saveButton: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e'
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d7dee7'
  },
  actionButtonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  secondaryButtonLabel: {
    color: '#17324d'
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
    color: '#8a3328'
  },
  formGrid: {
    gap: 10
  },
  inputGroup: {
    gap: 4
  },
  inputLabel: {
    color: '#6b7b90',
    fontSize: 12,
    fontWeight: '700'
  },
  textInput: {
    color: '#132536',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8e1eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    // 16 px or more: iOS Safari zooms the page into smaller text fields on focus.
    fontSize: 16
  },
  savedFoodBanner: {
    backgroundColor: '#ecfdf3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    gap: 4
  },
  savedFoodTitle: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  }
});
