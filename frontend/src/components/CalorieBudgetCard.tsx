/**
 * Top of Today: how many calories are left, with a tap-to-expand breakdown of the day's budget
 * and where the target comes from. Over budget is a nudge (amber), never an alarm.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNumber, useT } from '../i18n';
import { formatSigned, type CalorieBudget } from '../lib/calorie-budget';
import { tc } from '../theme/palette';

const BAR_COLORS = { bmr: tc.bg_7fa38c, activity: tc.fg_0f766e, workouts: tc.fg_ea580c } as const;

export function CalorieBudgetCard({
  budget,
  sharePercent,
  onOpenDiary
}: {
  budget: CalorieBudget;
  sharePercent: number;
  onOpenDiary?(): void;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const num = (value: number) => formatNumber(value, undefined, t.locale);
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t(open ? 'budget.hideBreakdown' : 'budget.showBreakdown', { headline: budget.headline })}
        style={styles.summary}
      >
        <Text style={[styles.headline, budget.over && styles.headlineOver]}>{budget.headline}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, budget.over && styles.fillOver, { width: `${Math.round(budget.progress * 100)}%` }]} />
        </View>
        <View style={styles.captionRow}>
          <Text style={styles.caption}>{budget.caption}</Text>
          <Text style={styles.toggle}>{open ? t('budget.hide') : t('budget.breakdown')}</Text>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.details}>
          <Text style={styles.eyebrow}>{t('budget.todaysBudget')}</Text>
          {budget.lines.map((line) => {
            const total = line.sign === '=';
            const row = (
              <View style={[styles.line, total && styles.lineTotal]}>
                <View style={styles.lineCopy}>
                  <Text style={[styles.lineLabel, total && styles.lineLabelTotal]}>
                    {line.sign && line.sign !== '=' ? `${line.sign} ` : total ? '= ' : ''}
                    {line.label}
                  </Text>
                  {line.detail ? <Text style={styles.lineDetail}>{line.detail}</Text> : null}
                </View>
                <Text
                  style={[
                    styles.lineValue,
                    total && styles.lineLabelTotal,
                    line.key === 'remaining' && budget.over && styles.headlineOver
                  ]}
                >
                  {formatSigned(line, t)}
                </Text>
              </View>
            );
            return line.key === 'eaten' && onOpenDiary ? (
              <Pressable key={line.key} onPress={onOpenDiary} accessibilityRole="link" accessibilityLabel={t('budget.openHistory')}>
                {row}
              </Pressable>
            ) : (
              <View key={line.key}>{row}</View>
            );
          })}
          {budget.workoutCaloriesKept > 0 && sharePercent < 100 ? (
            <Text style={styles.note}>
              {t('budget.keptNote', {
                kept: num(budget.workoutCaloriesKept),
                share: sharePercent > 0 ? t('budget.keptShare', { percent: sharePercent }) : ''
              })}
            </Text>
          ) : null}

          {budget.burn ? (
            <>
              <Text style={[styles.eyebrow, styles.eyebrowGap]}>{t('budget.whereFrom')}</Text>
              {budget.burn.bars.map((bar) => (
                <View key={bar.key} style={styles.burnRow}>
                  <View style={styles.burnHead}>
                    <Text style={styles.lineLabel}>{bar.label}</Text>
                    <Text style={styles.lineValue}>{num(bar.value)}</Text>
                  </View>
                  <View style={styles.burnTrack}>
                    <View style={[styles.burnFill, { backgroundColor: BAR_COLORS[bar.key], width: `${Math.max(2, Math.round(bar.fraction * 100))}%` }]} />
                  </View>
                </View>
              ))}
              <View style={[styles.line, styles.lineTotal]}>
                <Text style={styles.lineLabel}>{budget.burn.paceLabel}</Text>
                <Text style={styles.lineValue}>
                  {budget.burn.pace > 0 ? '+' : budget.burn.pace < 0 ? '−' : ''}
                  {num(Math.abs(budget.burn.pace))}
                </Text>
              </View>
              <Text style={styles.note}>{t('budget.targetNote')}</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  summary: { gap: 8 },
  headline: { color: tc.fg_132536, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  headlineOver: { color: tc.fg_b45309 },
  track: { height: 10, borderRadius: 999, backgroundColor: tc.bg_e2e8f0, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: tc.brand_primary },
  fillOver: { backgroundColor: tc.fg_f59e0b },
  captionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  caption: { color: tc.fg_5c6d80, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  toggle: { color: tc.fg_0f766e, fontSize: 13, fontWeight: '700' },
  details: { gap: 6, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.line_d7dee7 },
  eyebrow: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8 },
  eyebrowGap: { marginTop: 16 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  lineTotal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.line_e2e8f0, paddingTop: 6 },
  lineCopy: { flex: 1, gap: 2 },
  lineLabel: { color: tc.fg_132536, fontSize: 15, fontWeight: '600' },
  lineLabelTotal: { fontWeight: '800' },
  lineDetail: { color: tc.fg_6b7b90, fontSize: 12 },
  lineValue: { color: tc.fg_132536, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { color: tc.fg_6b7b90, fontSize: 12, lineHeight: 17, marginTop: 4 },
  burnRow: { gap: 4, paddingVertical: 2 },
  burnHead: { flexDirection: 'row', justifyContent: 'space-between' },
  burnTrack: { height: 8, borderRadius: 999, backgroundColor: tc.bg_eef2f6, overflow: 'hidden' },
  burnFill: { height: '100%', borderRadius: 999 }
});
