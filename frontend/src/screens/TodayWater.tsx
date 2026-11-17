import type { ReactElement } from 'react';
import { View } from 'react-native';

import { WaterRow } from '../components/WaterRow';
import { DEFAULT_WATER_GOAL_ML } from '../lib/water';
import type { UserProfile, WaterEntry } from '../types';
import { styles } from './shared/styles';

export interface TodayWaterProps {
  homeWaterMl: number;
  profile: UserProfile | null;
  waterBusy: boolean;
  homeWaterToday: WaterEntry[];
  addHomeWater: (ml: number) => Promise<void>;
  undoHomeWater: () => Promise<void>;
}

export function TodayWater({
  homeWaterMl,
  profile,
  waterBusy,
  homeWaterToday,
  addHomeWater,
  undoHomeWater
}: TodayWaterProps): ReactElement {
  return (
    <View style={styles.homeSection}>
      <WaterRow
        totalMl={homeWaterMl}
        goalMl={profile?.water_goal_ml ?? DEFAULT_WATER_GOAL_ML}
        metric={profile?.units === 'metric'}
        busy={waterBusy}
        canUndo={homeWaterToday.length > 0}
        onAdd={(ml) => void addHomeWater(ml)}
        onUndo={() => void undoHomeWater()}
      />
    </View>
  );
}
