/**
 * Scan from Today's Meals: one viewfinder for a barcode, package front, or nutrition label.
 *
 * - Barcode: your food bank first (instant, free), else Open Food Facts / USDA, saved to the bank.
 * - Package front or label: one AI read. Nothing is saved until you Add or Save on the sheet.
 * - A plate, bowl, or whole foods: the items and portions it sees, with USDA nutrition, all
 *   added with one tap (each item logged on its own).
 *   A matched package says so and offers "Scan the nutrition label" for the exact numbers (the
 *   label replaces the match; the name and brand from the front are kept).
 *
 * Every path ends on the add sheet: amount, meal, ☆, Add to the day or Save to the food bank.
 */
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import {
  acceptIngestionOutput,
  fetchIngestionOutput,
  foodForBarcode,
  saveFoodFromIngestionOutput,
  smartScan
} from '../lib/api';
import { pickPhotoFromCamera, prepareScanPhoto } from '../lib/web-photo';
import { tc } from '../theme/palette';
import type { FoodItem, PlateItem, SmartScanResult } from '../types';
import { AddFoodSheet } from './AddFoodSheet';
import { PlateSheet } from './PlateSheet';
import {
  buildAcceptedNutritionPayload,
  buildNutritionDraft,
  matchInfo,
  previewFoodFromScan
} from './ingestionReviewHelpers';
import { WebBarcodeScanner } from './WebBarcodeScanner';

type Pending = { outputId: string; structuredJson: unknown; kind: 'nutrition_label' | 'package_front' };

type Phase =
  | { kind: 'scanning'; labelFor?: string; labelOnly?: boolean }
  | { kind: 'looking'; text: string }
  | { kind: 'confirm'; foods: FoodItem[]; fromBank: boolean; pending?: Pending; note?: string | null }
  | { kind: 'plate'; items: PlateItem[] }
  | { kind: 'missing'; message: string; packageOutputId?: string; barcode?: string };

export function QuickScanAdd({
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose,
  onSearch,
  onQuickCalories
}: {
  accessToken: string;
  logDate: string;
  /** "today", or the day's name when another day is chosen. */
  dayName: string;
  onAdded(food?: FoodItem): void;
  onClose(): void;
  /** Nothing to photograph: search instead, or just enter calories. */
  onSearch?(): void;
  onQuickCalories?(): void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  // Remounts the viewfinder (restarting the live camera), e.g. after the photo camera was cancelled.
  const [scannerKey, setScannerKey] = useState(0);
  // A barcode that came back without nutrition: the label scanned next updates that product.
  const missingBarcode = useRef<string | null>(null);

  async function lookUpBarcode(code: string) {
    missingBarcode.current = null;
    setPhase({ kind: 'looking', text: t('scan.lookingUpBarcode') });
    try {
      const result = await foodForBarcode(code, accessToken);
      if (result.found && result.foods.length > 0) {
        setPhase({ kind: 'confirm', foods: result.foods, fromBank: result.source === 'food_bank' });
      } else {
        missingBarcode.current = code;
        setPhase({
          kind: 'missing',
          message: result.message ?? t('scan.barcodeNotFound'),
          barcode: code
        });
      }
    } catch (error) {
      setPhase({ kind: 'missing', message: error instanceof Error ? error.message : t('scan.barcodeFailed') });
    }
  }

  async function read(image: Blob, labelFor?: string) {
    setPhase({ kind: 'looking', text: t('scan.reading') });
    try {
      const prepared = await prepareScanPhoto(image);
      await showResult(await smartScan(prepared.base64, accessToken, labelFor ?? null, missingBarcode.current), labelFor);
    } catch (error) {
      setPhase({ kind: 'missing', message: error instanceof Error ? error.message : t('scan.failed'), packageOutputId: labelFor });
    }
  }

  async function showResult(result: SmartScanResult, labelFor?: string) {
    if (result.kind === 'meal_plate' && result.items.length > 0) {
      setPhase({ kind: 'plate', items: result.items });
      return;
    }
    if (result.kind === 'unreadable' || !result.output_id) {
      setPhase({ kind: 'missing', message: result.message ?? t('scan.unreadable'), packageOutputId: labelFor });
      return;
    }
    if (result.kind === 'package_front') {
      await loadPackage(result.output_id);
      return;
    }
    const preview = previewFoodFromScan(result.label);
    if (!preview) {
      setPhase({
        kind: 'missing',
        message: t('scan.numbersUnreadable'),
        packageOutputId: labelFor
      });
      return;
    }
    setPhase({
      kind: 'confirm',
      foods: [preview],
      fromBank: false,
      pending: { outputId: result.output_id, structuredJson: result.label, kind: 'nutrition_label' },
      note: preview.name === 'Scanned food' ? t('scan.noName') : null
    });
  }

  async function loadPackage(outputId: string) {
    // The package scan's stored reading includes the database match (or says none was found).
    const output = await fetchIngestionOutput(outputId, accessToken);
    const info = matchInfo(output.structured_json);
    const preview = previewFoodFromScan(output.structured_json);
    if (info.kind !== 'match' || !preview) {
      const name = buildNutritionDraft(output.structured_json).product_name || t('scan.thisProduct');
      setPhase({
        kind: 'missing',
        message: t('scan.noNutrition', { name }),
        packageOutputId: outputId
      });
      return;
    }
    setPhase({
      kind: 'confirm',
      foods: [preview],
      fromBank: false,
      pending: { outputId, structuredJson: output.structured_json, kind: 'package_front' },
      note: info.note
    });
  }

  async function savePending(pending: Pending): Promise<FoodItem> {
    const draft = buildNutritionDraft(pending.structuredJson);
    if (!draft.product_name.trim()) {
      draft.product_name = 'Scanned food'; // a label that doesn't print the product's name
    }
    await acceptIngestionOutput(pending.outputId, accessToken, buildAcceptedNutritionPayload(draft, pending.structuredJson));
    const saved = await saveFoodFromIngestionOutput(pending.outputId, accessToken);
    const [food] = saved.saved_foods;
    if (!food) {
      throw new Error(t('scan.notSaved'));
    }
    return food;
  }

  async function takeFullPhoto(labelFor?: string) {
    // Opened straight from the tap: iOS only allows the photo camera from a user gesture.
    const file = await pickPhotoFromCamera();
    if (file) {
      await read(file, labelFor);
    } else {
      setScannerKey((key) => key + 1);
      setPhase({ kind: 'scanning', labelFor });
    }
  }

  if (phase.kind === 'scanning') {
    return (
      <WebBarcodeScanner
        key={scannerKey}
        visible
        labelOnly={Boolean(phase.labelFor || phase.labelOnly)}
        footerActions={
          phase.labelFor
            ? undefined
            : [
                ...(onSearch ? [{ label: t('scan.searchAction'), onPress: onSearch }] : []),
                ...(onQuickCalories ? [{ label: t('scan.quickCaloriesAction'), onPress: onQuickCalories }] : [])
              ]
        }
        onCode={(code) => void lookUpBarcode(code)}
        onCapture={(frame) => void read(frame, phase.labelFor)}
        onClose={onClose}
        onTakePhoto={() => void takeFullPhoto(phase.labelFor)}
      />
    );
  }

  if (phase.kind === 'plate') {
    return (
      <PlateSheet
        items={phase.items}
        accessToken={accessToken}
        logDate={logDate}
        dayName={dayName}
        onAdded={() => onAdded()}
        onClose={onClose}
        onScanAgain={() => setPhase({ kind: 'scanning' })}
      />
    );
  }

  if (phase.kind === 'confirm') {
    const pending = phase.pending;
    return (
      <AddFoodSheet
        foods={phase.foods}
        fromBank={phase.fromBank}
        accessToken={accessToken}
        logDate={logDate}
        dayName={dayName}
        note={phase.note}
        prepare={pending ? () => savePending(pending) : undefined}
        extraAction={
          pending?.kind === 'package_front'
            ? { label: t('scan.scanLabelForExact'), onPress: () => setPhase({ kind: 'scanning', labelFor: pending.outputId }) }
            : undefined
        }
        onAdded={onAdded}
        onSaved={onClose}
        onClose={onClose}
        onScanAgain={() => setPhase({ kind: 'scanning' })}
      />
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.body}>
            {phase.kind === 'looking' ? (
              <View style={styles.center}>
                <ActivityIndicator color={tc.brand_primary} />
                <Text style={styles.muted}>{phase.text}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.title}>{phase.packageOutputId || phase.barcode ? t('scan.scanTheLabel') : t('scan.notFound')}</Text>
                <Text style={styles.muted}>{phase.message}</Text>
                <Pressable
                  style={styles.primary}
                  onPress={() => setPhase({ kind: 'scanning', labelFor: phase.packageOutputId, labelOnly: Boolean(phase.barcode) })}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryLabel}>{phase.packageOutputId || phase.barcode ? t('scan.scanNutritionLabel') : t('common.scanAgain')}</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => void takeFullPhoto(phase.packageOutputId)} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>{t('common.takeFullPhoto')}</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>{t('common.cancel')}</Text>
                </Pressable>
              </>
            )}
          </View>
          <div style={{ height: 'max(12px, env(safe-area-inset-bottom))' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: tc.backdrop },
  sheet: {
    backgroundColor: tc.bg_ffffff,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  muted: { color: tc.fg_5c6d80, fontSize: 14, lineHeight: 19 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' }
});
