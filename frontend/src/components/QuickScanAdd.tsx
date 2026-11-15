/**
 * Quick add from Today's Meals: the barcode scanner opens straight away; a found product is
 * saved to the food bank and shown on the add sheet (servings or grams, with the numbers)
 * before anything is logged. Not found: photograph the label on the Scan screen instead.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { foodForBarcode } from '../lib/api';
import { tc } from '../theme/palette';
import type { FoodItem } from '../types';
import { AddFoodSheet } from './AddFoodSheet';
import { WebBarcodeScanner } from './WebBarcodeScanner';

type Phase =
  | { kind: 'scanning' }
  | { kind: 'looking' }
  | { kind: 'confirm'; foods: FoodItem[]; fromBank: boolean }
  | { kind: 'missing'; message: string };

export function QuickScanAdd({
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose,
  onPhotographLabel
}: {
  accessToken: string;
  logDate: string;
  /** "today", or the day's name when another day is chosen. */
  dayName: string;
  onAdded(food: FoodItem): void;
  onClose(): void;
  /** Open the full Scan screen to photograph the nutrition label. */
  onPhotographLabel(): void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });

  async function lookUp(code: string) {
    setPhase({ kind: 'looking' });
    try {
      const result = await foodForBarcode(code, accessToken);
      if (result.found && result.foods.length > 0) {
        setPhase({ kind: 'confirm', foods: result.foods, fromBank: result.source === 'food_bank' });
      } else {
        setPhase({ kind: 'missing', message: result.message ?? "We couldn't find this barcode." });
      }
    } catch (lookupError) {
      setPhase({ kind: 'missing', message: lookupError instanceof Error ? lookupError.message : 'Barcode lookup failed.' });
    }
  }

  if (phase.kind === 'scanning') {
    return <WebBarcodeScanner visible onCode={(code) => void lookUp(code)} onClose={onClose} onTakePhoto={onPhotographLabel} />;
  }
  if (phase.kind === 'confirm') {
    return (
      <AddFoodSheet
        foods={phase.foods}
        fromBank={phase.fromBank}
        accessToken={accessToken}
        logDate={logDate}
        dayName={dayName}
        onAdded={onAdded}
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
                <Text style={styles.muted}>Looking up the barcode…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.title}>Not found</Text>
                <Text style={styles.muted}>{phase.message}</Text>
                <Pressable style={styles.primary} onPress={onPhotographLabel} accessibilityRole="button">
                  <Text style={styles.primaryLabel}>Photograph the label</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => setPhase({ kind: 'scanning' })} accessibilityRole="button">
                  <Text style={styles.secondaryLabel}>Scan again</Text>
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
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  center: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  muted: { color: tc.fg_5c6d80, fontSize: 14, lineHeight: 19 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: tc.brand_primary },
  primaryLabel: { color: tc.fg_ffffff, fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryLabel: { color: tc.fg_0f766e, fontSize: 15, fontWeight: '700' }
});
