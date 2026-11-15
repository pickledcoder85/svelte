/**
 * Search from Today's Meals: your food bank first, then USDA ("green apple"). Picking a food
 * opens the add sheet (amount, meal, favorite) for the day.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchFoodBank, searchFoodsWithSession } from '../lib/api';
import { tc } from '../theme/palette';
import type { FoodItem } from '../types';
import { AddFoodSheet } from './AddFoodSheet';

const SEARCH_DELAY_MS = 350;

export function FoodSearchSheet({
  accessToken,
  logDate,
  dayName,
  onAdded,
  onClose
}: {
  accessToken: string;
  logDate: string;
  dayName: string;
  onAdded(food: FoodItem): void;
  onClose(): void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const trimmed = query.trim();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError(null);
        // Empty: your foods, most used first. Typed: your foods, then USDA.
        (trimmed ? searchFoodsWithSession(trimmed, accessToken) : fetchFoodBank(accessToken))
          .then((foods) => {
            if (id === requestId.current) {
              setResults(foods.slice(0, 30));
            }
          })
          .catch((searchError) => {
            if (id === requestId.current) {
              setError(searchError instanceof Error ? searchError.message : 'Search failed.');
            }
          })
          .finally(() => {
            if (id === requestId.current) {
              setLoading(false);
            }
          });
      },
      trimmed ? SEARCH_DELAY_MS : 0
    );
    return () => clearTimeout(timer);
  }, [query, accessToken]);

  if (picked) {
    return (
      <AddFoodSheet
        foods={[picked]}
        fromBank={Boolean(picked.in_bank)}
        accessToken={accessToken}
        logDate={logDate}
        dayName={dayName}
        onAdded={onAdded}
        onSaved={onClose}
        onClose={() => setPicked(null)}
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
            <Text style={styles.title}>Search foods</Text>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Your foods or USDA, e.g. green apple"
              placeholderTextColor={tc.fg_8a97a8}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search foods"
            />
            {!query.trim() ? <Text style={styles.muted}>Your foods, most used first</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listBody} keyboardShouldPersistTaps="handled">
            {loading && results.length === 0 ? <ActivityIndicator color={tc.brand_primary} /> : null}
            {!loading && results.length === 0 && !error ? (
              <Text style={styles.muted}>{query.trim() ? 'Nothing found. Try fewer words.' : 'No saved foods yet. Search for one.'}</Text>
            ) : null}
            {results.map((food) => (
              <Pressable
                key={food.id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setPicked(food)}
                accessibilityRole="button"
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {food.favorite ? '★ ' : ''}
                    {food.name}
                  </Text>
                  <Text style={styles.rowDetail} numberOfLines={1}>
                    {[food.brand, food.serving_text ?? `${food.serving_size} ${food.serving_unit}`, food.in_bank ? 'Your food' : food.source === 'USDA' ? 'USDA' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text style={styles.rowCalories}>{Math.round(food.calories)} kcal</Text>
              </Pressable>
            ))}
          </ScrollView>
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
    alignSelf: 'center',
    height: '85%'
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 999, backgroundColor: tc.line_d7dee7, marginBottom: 8 },
  body: { paddingHorizontal: 20, gap: 10, paddingBottom: 8 },
  title: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 14,
    fontSize: 17,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  muted: { color: tc.fg_5c6d80, fontSize: 13 },
  error: { color: tc.fg_b42318, fontSize: 14 },
  list: { flex: 1 },
  listBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  rowPressed: { backgroundColor: tc.bg_eef2f6 },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: tc.fg_132536, fontSize: 16, fontWeight: '700' },
  rowDetail: { color: tc.fg_6b7b90, fontSize: 13 },
  rowCalories: { color: tc.fg_132536, fontSize: 15, fontWeight: '700' }
});
