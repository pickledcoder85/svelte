/**
 * The bottom tab bar: Today · Log · 📷 · Trends · Plan. The raised camera in the middle opens
 * the scanner straight away (scan and log a food). Sits under the thumb; the page keeps it clear
 * of the iPhone home indicator.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { APP_TABS, type AppTabId } from '../lib/app-shell';
import { usePalette } from '../theme/appearance';
import { tc } from '../theme/palette';

function TabIcon({ tab, color }: { tab: AppTabId; color: string }) {
  const common = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === 'today' ? (
        <>
          <Circle cx={12} cy={12} r={4} {...common} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...common} />
        </>
      ) : tab === 'log' ? (
        <>
          <Rect x={5} y={3} width={14} height={18} rx={2} {...common} />
          <Path d="M9 8h6M9 12h6M9 16h4" {...common} />
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
  onCamera
}: {
  activeTab: AppTabId | null;
  onSelect(tab: AppTabId): void;
  onCamera(): void;
}) {
  const pal = usePalette();
  const [first, second, ...rest] = APP_TABS;
  const renderTab = (tab: (typeof APP_TABS)[number]) => {
    const active = tab.id === activeTab;
    const color = active ? pal.fg_17324d : pal.fg_7a8797;
    return (
      <Pressable
        key={tab.id}
        style={styles.tab}
        onPress={() => onSelect(tab.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tab.label}
      >
        <TabIcon tab={tab.id} color={color} />
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {renderTab(first)}
        {renderTab(second)}
        <Pressable style={styles.plusSlot} onPress={onCamera} accessibilityRole="button" accessibilityLabel="Scan a food to log it">
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
  plusLabel: {
    color: tc.fg_ffffff,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600'
  }
});
