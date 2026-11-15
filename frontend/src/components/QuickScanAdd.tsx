/**
 * Scan from Today's Meals: one viewfinder for a barcode, package front, or nutrition label.
 *
 * - Barcode: your food bank first (instant, free), else Open Food Facts / USDA, saved to the bank.
 * - Package front or label: one AI read. Nothing is saved until you Add or Save on the sheet.
 *   A matched package says so and offers "Scan the nutrition label" for the exact numbers (the
 *   label replaces the match; the name and brand from the front are kept).
 *
 * Every path ends on the add sheet: amount, meal, ☆, Add to the day or Save to the food bank.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  acceptIngestionOutput,
  fetchIngestionOutput,
  foodForBarcode,
  saveFoodFromIngestionOutput,
  smartScan
} from '../lib/api';
import { pickPhotoFromCamera, prepareScanPhoto } from '../lib/web-photo';
import { tc } from '../theme/palette';
import type { FoodItem, SmartScanResult } from '../types';
import { AddFoodSheet } from './AddFoodSheet';
import {
  buildAcceptedNutritionPayload,
  buildNutritionDraft,
  matchInfo,
  previewFoodFromScan
} from './ingestionReviewHelpers';
import { WebBarcodeScanner } from './WebBarcodeScanner';

type Pending = { outputId: string; structuredJson: unknown; kind: 'nutrition_label' | 'package_front' };

type Phase =
  | { kind: 'scanning'; labelFor?: string }
  | { kind: 'looking'; text: string }
  | { kind: 'confirm'; foods: FoodItem[]; fromBank: boolean; pending?: Pending; note?: string | null }
  | { kind: 'missing'; message: string; packageOutputId?: string };

export function QuickScanAdd({
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose
}: {
  accessToken: string;
  logDate: string;
  /** "today", or the day's name when another day is chosen. */
  dayName: string;
  onAdded(food: FoodItem): void;
  onClose(): void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });

  async function lookUpBarcode(code: string) {
    setPhase({ kind: 'looking', text: 'Looking up the barcode…' });
    try {
      const result = await foodForBarcode(code, accessToken);
      if (result.found && result.foods.length > 0) {
        setPhase({ kind: 'confirm', foods: result.foods, fromBank: result.source === 'food_bank' });
      } else {
        setPhase({ kind: 'missing', message: result.message ?? "We couldn't find this barcode. Scan the nutrition label instead." });
      }
    } catch (error) {
      setPhase({ kind: 'missing', message: error instanceof Error ? error.message : 'Barcode lookup failed.' });
    }
  }

  async function read(image: Blob, labelFor?: string) {
    setPhase({ kind: 'looking', text: 'Reading…' });
    try {
      const prepared = await prepareScanPhoto(image);
      await showResult(await smartScan(prepared.base64, accessToken, labelFor ?? null), labelFor);
    } catch (error) {
      setPhase({ kind: 'missing', message: error instanceof Error ? error.message : 'Scan failed.', packageOutputId: labelFor });
    }
  }

  async function showResult(result: SmartScanResult, labelFor?: string) {
    if (result.kind === 'unreadable' || !result.output_id) {
      setPhase({ kind: 'missing', message: result.message ?? "Couldn't read that.", packageOutputId: labelFor });
      return;
    }
    if (result.kind === 'package_front') {
      await loadPackage(result.output_id);
      return;
    }
    const preview = previewFoodFromScan(result.label);
    if (!preview) {
      setPhase({ kind: 'missing', message: "Couldn't read the numbers. Hold the label a little closer and try again." });
      return;
    }
    setPhase({
      kind: 'confirm',
      foods: [preview],
      fromBank: false,
      pending: { outputId: result.output_id, structuredJson: result.label, kind: 'nutrition_label' },
      note: preview.name === 'Scanned food' ? "The label doesn't show the product's name: you can rename it in Foods." : null
    });
  }

  async function loadPackage(outputId: string) {
    // The package scan's stored reading includes the database match (or says none was found).
    const output = await fetchIngestionOutput(outputId, accessToken);
    const info = matchInfo(output.structured_json);
    const preview = previewFoodFromScan(output.structured_json);
    if (info.kind !== 'match' || !preview) {
      const name = buildNutritionDraft(output.structured_json).product_name || 'this product';
      setPhase({
        kind: 'missing',
        message: `No nutrition found for ${name}. Scan its nutrition label for the numbers.`,
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
      throw new Error("The food couldn't be saved.");
    }
    return food;
  }

  async function takeFullPhoto(labelFor?: string) {
    // Opened straight from the tap: iOS only allows the photo camera from a user gesture.
    const file = await pickPhotoFromCamera();
    if (file) {
      await read(file, labelFor);
    }
  }

  if (phase.kind === 'scanning') {
    return (
      <WebBarcodeScanner
        visible
        labelOnly={Boolean(phase.labelFor)}
        onCode={(code) => void lookUpBarcode(code)}
        onCapture={(frame) => void read(frame, phase.labelFor)}
        onClose={onClose}
        onTakePhoto={() => void takeFullPhoto(phase.labelFor)}
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
            ? { label: 'Scan the nutrition label for exact numbers', onPress: () => setPhase({ kind: 'scanning', labelFor: pending.outputId }) }
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
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
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
                <Text style={styles.title}>{phase.packageOutputId ? 'Scan the label' : 'Not found'}</Text>
                <Text style={styles.muted}>{phase.message}</Text>
                <Pressable
                  style={styles.primary}
                  onPress={() => setPhase({ kind: 'scanning', labelFor: phase.packageOutputId })}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryLabel}>{phase.packageOutputId ? 'Scan the nutrition label' : 'Scan again'}</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => void takeFullPhoto(phase.packageOutputId)} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>Take a full photo</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>Cancel</Text>
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
