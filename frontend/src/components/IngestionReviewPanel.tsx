import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import {
  acceptIngestionOutput,
  fetchIngestionQueue,
  ingestNutritionLabel,
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
  pendingOutputs,
  type EditableNutritionDraft
} from './ingestionReviewHelpers';

interface IngestionReviewPanelProps {
  accessToken: string | null;
}

type SyncTone = 'checking' | 'live';

export function IngestionReviewPanel({ accessToken }: IngestionReviewPanelProps) {
  const cameraRef = useRef<CameraView | null>(null);
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
  const [captureLoading, setCaptureLoading] = useState<'package' | 'label' | null>(null);
  const [cameraMode, setCameraMode] = useState<'package' | 'label' | null>(null);
  const [lastPackageScan, setLastPackageScan] = useState<VisionPackageScanResult | null>(null);
  const [savedFood, setSavedFood] = useState<FoodItem | null>(null);
  const [savingFoodId, setSavingFoodId] = useState<string | null>(null);
  const [nutritionDraft, setNutritionDraft] = useState<EditableNutritionDraft>(() => buildNutritionDraft(null));

  useEffect(() => {
    setNutritionDraft(buildNutritionDraft(selectedOutput?.structured_json));
  }, [selectedOutput]);

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
    setSavedFood(null);
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
    setSavedFood(null);
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
    setSavedFood(null);
    setTone('checking');
    setStatusLabel(action === 'accept' ? 'Accepting output' : 'Rejecting output');
    setStatusDetail('Saving the review decision.');

    try {
      const reviewed =
        action === 'accept'
          ? await acceptIngestionOutput(outputId, accessToken, buildAcceptedNutritionPayload(nutritionDraft))
          : await rejectIngestionOutput(outputId, accessToken);

      setOutputs((current) => current.filter((item) => item.id !== reviewed.id));
      setSelectedOutputId(reviewed.id);
      setSelectedOutput(reviewed);
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
      const food = await saveFoodFromIngestionOutput(selectedOutput.id, accessToken);
      setSavedFood(food);
      setTone('live');
      setStatusLabel('Food saved');
      setStatusDetail(`${food.name} is now available in the food catalog.`);
    } catch (error) {
      setTone('checking');
      setStatusLabel('Food save failed');
      setStatusDetail('The accepted output could not be saved as a food item.');
      setQueueError(error instanceof Error ? error.message : 'Unable to save food item.');
    } finally {
      setSavingFoodId(null);
    }
  }

  async function beginCapture(mode: 'package' | 'label') {
    if (captureLoading) {
      return;
    }

    if (Platform.OS === 'web') {
      await selectFromLibrary(mode, setQueueError, setPackageBase64, setPackageFileName, setLabelBase64, setLabelFileName);
      return;
    }

    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission?.granted) {
      setQueueError('Camera permission is required to scan packages and labels.');
      return;
    }

    setQueueError(null);
    setCameraMode(mode);
  }

  async function captureFromCamera() {
    if (!cameraMode || !cameraRef.current || captureLoading) {
      return;
    }

    const activeMode = cameraMode;
    setCaptureLoading(cameraMode);
    setQueueError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const base64 = photo.base64 ?? '';
      if (!base64) {
        throw new Error('Camera capture did not return image data.');
      }

      if (activeMode === 'package') {
        setPackageBase64(base64);
        setPackageFileName(`live-package-${Date.now()}.jpg`);
        setCameraMode(null);
        await createPackageScanFromBase64(base64);
      } else {
        setLabelBase64(base64);
        setLabelFileName(`live-label-${Date.now()}.jpg`);
        setCameraMode(null);
        await createLabelScanFromBase64(base64);
      }
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Unable to capture image from camera.');
    } finally {
      setCaptureLoading(null);
      setCameraMode(null);
    }
  }

  const displayOutput = selectedOutput;
  const pendingCount = outputs.length;
  const browserUploadsSupported = Platform.OS === 'web';
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

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>Ingestion</Text>
      <Text style={styles.title}>Camera food bank</Text>
      <Text style={styles.detail}>
        Capture a package or label frame directly from the live camera on phone, or choose an image in the browser,
        then review and save the extracted food data.
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
          {browserUploadsSupported
            ? 'Choose images in the browser, then run the same scan, review, and save flow.'
            : 'Open the live camera and tap Scan Current Frame. The app captures and submits that frame immediately without saving a photo.'}
        </Text>

        <View style={styles.detailBlock}>
          <Text style={styles.detailBlockLabel}>Package-front image</Text>
          {browserUploadsSupported ? (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>{packageFileName ?? 'No package image selected'}</Text>
                <Text style={styles.uploadSummaryDetail}>
                  {packageBase64.length > 0
                    ? 'Image data is ready for package-front analysis.'
                    : 'Choose a package image to create a scan output.'}
                </Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() =>
                  void selectFromLibrary(
                    'package',
                    setQueueError,
                    setPackageBase64,
                    setPackageFileName,
                    setLabelBase64,
                    setLabelFileName
                  )
                }
                disabled={captureLoading !== null}
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {packageFileName ? 'Replace Package Image' : 'Choose Package Image'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>{packageFileName ?? 'No live package frame captured'}</Text>
                <Text style={styles.uploadSummaryDetail}>{cameraReady}</Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void beginCapture('package')}
                disabled={captureLoading !== null}
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {packageFileName ? 'Scan Package Front Again' : 'Open Live Package Scanner'}
                </Text>
              </Pressable>
            </>
          )}
          {browserUploadsSupported ? (
            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => void createPackageScan()}
              disabled={!accessToken || captureLoading !== null || packageBase64.trim().length === 0}
            >
              <Text style={styles.actionButtonLabel}>
                {captureLoading === 'package' ? 'Scanning...' : 'Scan Package Front'}
              </Text>
            </Pressable>
          ) : null}
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

        <View style={styles.detailBlock}>
          <Text style={styles.detailBlockLabel}>Nutrition-label image</Text>
          {browserUploadsSupported ? (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>{labelFileName ?? 'No label image selected'}</Text>
                <Text style={styles.uploadSummaryDetail}>
                  {labelBase64.length > 0
                    ? 'Image data is ready for nutrition-label analysis.'
                    : 'Choose a label image to create a reviewable label scan.'}
                </Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() =>
                  void selectFromLibrary(
                    'label',
                    setQueueError,
                    setPackageBase64,
                    setPackageFileName,
                    setLabelBase64,
                    setLabelFileName
                  )
                }
                disabled={captureLoading !== null}
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {labelFileName ? 'Replace Label Image' : 'Choose Label Image'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.uploadSummaryCard}>
                <Text style={styles.uploadSummaryTitle}>{labelFileName ?? 'No live label frame captured'}</Text>
                <Text style={styles.uploadSummaryDetail}>{cameraReady}</Text>
              </View>
              <Pressable
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => void beginCapture('label')}
                disabled={captureLoading !== null}
              >
                <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>
                  {labelFileName ? 'Scan Nutrition Label Again' : 'Open Live Label Scanner'}
                </Text>
              </Pressable>
            </>
          )}
          {browserUploadsSupported ? (
            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => void createLabelScan()}
              disabled={!accessToken || captureLoading !== null || labelBase64.trim().length === 0}
            >
              <Text style={styles.actionButtonLabel}>
                {captureLoading === 'label' ? 'Scanning...' : 'Scan Nutrition Label'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Pending outputs</Text>
        {queueLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#17324d" />
            <Text style={styles.detailText}>Loading the review queue...</Text>
          </View>
        ) : pendingCount === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing pending</Text>
            <Text style={styles.detailText}>
              New package or label outputs will appear here as they wait for review.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {outputs.map((output) => {
              const active = output.id === selectedOutputId;
              return (
                <Pressable
                  key={output.id}
                  style={[styles.listRow, active && styles.listRowActive]}
                  onPress={() => {
                    setSelectedOutputId(output.id);
                    setSelectedOutput(output);
                    setSavedFood(null);
                  }}
                >
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{describeOutput(output)}</Text>
                    <Text style={styles.listCaption}>
                      {formatCreatedAt(output.created_at)} · {Math.round(output.confidence * 100)}% confidence
                    </Text>
                  </View>
                  <Text style={styles.listMetric}>pending</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Selected output</Text>
        {displayOutput ? (
          <View style={styles.detailStack}>
            <View style={styles.detailHeadingRow}>
              <View style={styles.detailHeadingCopy}>
                <Text style={styles.detailTitle}>{describeOutput(displayOutput)}</Text>
                <Text style={styles.detailSubtitle}>
                  {displayOutput.ingestion_job_id} · {formatCreatedAt(displayOutput.created_at)} ·{' '}
                  {Math.round(displayOutput.confidence * 100)}% confidence
                </Text>
              </View>
              <View style={styles.stateChip}>
                <Text style={styles.stateChipLabel}>{displayOutput.review_state}</Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Review fields</Text>
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
              {displayOutput.review_state === 'pending' ? (
                <Text style={styles.detailNote}>
                  Edit the extracted nutrition values before accepting. Save-to-food becomes available after acceptance.
                </Text>
              ) : null}
            </View>

            <View style={styles.detailBlock}>
              <Text style={styles.detailBlockLabel}>Structured JSON</Text>
              <Text style={styles.codeBlock}>{formatStructuredJson(displayOutput.structured_json)}</Text>
            </View>

            {savedFood ? (
              <View style={styles.savedFoodBanner}>
                <Text style={styles.savedFoodTitle}>Saved food</Text>
                <Text style={styles.detailText}>
                  {savedFood.name} · {savedFood.brand ?? 'No brand'} · {savedFood.source}
                </Text>
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

      <Modal visible={cameraMode !== null} animationType="slide" onRequestClose={() => setCameraMode(null)}>
        <View style={styles.cameraModal}>
          <View style={styles.cameraHeader}>
            <View style={styles.cameraHeaderCopy}>
              <Text style={styles.cameraEyebrow}>{cameraMode === 'package' ? 'Package scan' : 'Label scan'}</Text>
              <Text style={styles.cameraTitle}>
                {cameraMode === 'package' ? 'Frame the package front' : 'Frame the nutrition label'}
              </Text>
              <Text style={styles.cameraDetail}>
                Hold the phone steady, then tap Scan. The current frame is captured directly from the live camera view.
              </Text>
            </View>
            <Pressable style={[styles.actionButton, styles.secondaryButton]} onPress={() => setCameraMode(null)}>
              <Text style={[styles.actionButtonLabel, styles.secondaryButtonLabel]}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.cameraPreviewShell}>
            <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" mode="picture" />
            <View style={styles.cameraGuide} pointerEvents="none">
              <View style={styles.cameraGuideFrame} />
            </View>
          </View>
          <View style={styles.cameraActionRow}>
            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => void captureFromCamera()}
              disabled={captureLoading !== null}
            >
              <Text style={styles.actionButtonLabel}>
                {captureLoading === cameraMode ? 'Scanning...' : 'Scan Current Frame'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

async function selectFromLibrary(
  mode: 'package' | 'label',
  setError: Dispatch<SetStateAction<string | null>>,
  setPackageBase64: Dispatch<SetStateAction<string>>,
  setPackageFileName: Dispatch<SetStateAction<string | null>>,
  setLabelBase64: Dispatch<SetStateAction<string>>,
  setLabelFileName: Dispatch<SetStateAction<string | null>>
) {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      base64: true
    });
    if (result.canceled || !result.assets?.[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const assetBase64 = asset.base64 ?? '';
    if (mode === 'package') {
      setPackageBase64(assetBase64);
      setPackageFileName(asset.fileName ?? asset.uri.split('/').pop() ?? 'package-image.jpg');
    } else {
      setLabelBase64(assetBase64);
      setLabelFileName(asset.fileName ?? asset.uri.split('/').pop() ?? 'label-image.jpg');
    }
    setError(null);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unable to load selected image.');
  }
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
    padding: 16,
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
    fontSize: 14
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
