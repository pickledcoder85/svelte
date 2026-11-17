/**
 * The bottom tab bar: Today · Trends · 📷 · Weigh in · Plan. The raised camera opens the scanner
 * straight away (scan and log a food); the scale opens the quick weigh-in. Sits under the
 * thumb; the page keeps it clear of the iPhone home indicator.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useT } from '../i18n';
import { APP_TABS, type AppTabId } from '../lib/app-shell';
import { usePalette } from '../theme/appearance';
import { tc } from '../theme/palette';

function TabIcon({ tab, color }: { tab: AppTabId | 'scale'; color: string }) {
  const common = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === 'today' ? (
        <>
          <Circle cx={12} cy={12} r={4} {...common} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...common} />
        </>
      ) : tab === 'scale' ? (
        // A digital bathroom scale (after assets/bathroom-scale.svg): the platform and its readout.
        <>
          <Rect x={3} y={3} width={18} height={18} rx={4.5} {...common} />
          <Rect x={8} y={6.5} width={8} height={4.5} rx={1.2} {...common} />
        </>
      ) : tab === 'trends' ? (
        <Path d="M3 17l5-5 4 4 8-8M15 8h5v5" {...common} />
      ) : (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} {...common} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...common} />
        </>
      )}
    </Svg>
  );
}

export function TabBar({
  activeTab,
  onSelect,
  onCamera,
  onWeighIn
}: {
  activeTab: AppTabId | null;
  onSelect(tab: AppTabId): void;
  onCamera(): void;
  onWeighIn(): void;
}) {
  const pal = usePalette();
  const t = useT();
  const [first, second, ...rest] = APP_TABS;
  const idle = pal.fg_7a8797;
  const renderTab = (tab: (typeof APP_TABS)[number]) => {
    const active = tab.id === activeTab;
    const color = active ? pal.fg_17324d : pal.fg_7a8797;
    const label = t(`nav.tabs.${tab.id}`);
    return (
      <Pressable
        key={tab.id}
        style={styles.tab}
        onPress={() => onSelect(tab.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
      >
        <TabIcon tab={tab.id} color={color} />
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {renderTab(first)}
        {renderTab(second)}
        <Pressable style={styles.plusSlot} onPress={onCamera} accessibilityRole="button" accessibilityLabel={t('nav.scanToLog')}>
          <View style={styles.plus}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path
                d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
                stroke="#ffffff"
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
              />
              <Circle cx={12} cy={13} r={3.5} stroke="#ffffff" strokeWidth={2} fill="none" />
            </Svg>
          </View>
        </Pressable>
        <Pressable style={styles.tab} onPress={onWeighIn} accessibilityRole="button" accessibilityLabel={t('nav.weighIn')}>
          <TabIcon tab="scale" color={idle} />
          <Text style={styles.label}>{t('nav.weighIn')}</Text>
        </Pressable>
        {rest.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The page's own colour: the strip the page keeps clear for the home indicator blends in.
  bar: {
    backgroundColor: tc.bg_f4efe4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tc.line_d7dee7
  },
  // Extra room underneath keeps the icons clear of the phone's rounded corners and the home
  // indicator.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 18
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4
  },
  label: {
    color: tc.fg_7a8797,
    fontSize: 11,
    fontWeight: '600'
  },
  labelActive: {
    color: tc.fg_17324d,
    fontWeight: '800'
  },
  plusSlot: {
    flex: 1,
    alignItems: 'center'
  },
  // Rises a little above the bar, with clear space between it and the bar's top edge.
  plus: {
    width: 46,
    height: 46,
    marginTop: -8,
    marginBottom: 2,
    borderRadius: 23,
    backgroundColor: tc.brand_primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#132536',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
});
