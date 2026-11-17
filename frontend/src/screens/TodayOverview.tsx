import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { CalorieBudgetCard } from '../components/CalorieBudgetCard';
import { useT } from '../i18n';
import { MacroRing } from '../components/MacroRing';
import type { CalorieBudget } from '../lib/calorie-budget';
import { DEFAULT_WORKOUT_CALORIES_SHARE, type DailyTargetSummary } from '../lib/daily-home';
import { tc } from '../theme/palette';
import type { AppSection, MacroTargets, UserProfile } from '../types';
import { styles } from './shared/styles';

export interface TodayOverviewProps {
  dailyHomeTargets: DailyTargetSummary;
  homeCalorieBudget: CalorieBudget;
  profile: UserProfile | null;
  handleSectionChange: (nextSection: AppSection) => void;
  homeConsumedMacros: MacroTargets;
}

export function TodayOverview({
  dailyHomeTargets,
  homeCalorieBudget,
  profile,
  handleSectionChange,
  homeConsumedMacros
}: TodayOverviewProps): ReactElement {
  const t = useT();
  return (
    <View style={styles.homeSection}>
      {dailyHomeTargets.calorieTarget > 0 ? (
        <CalorieBudgetCard
          budget={homeCalorieBudget}
          sharePercent={profile?.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE}
          onOpenDiary={() => handleSectionChange('trends')}
        />
      ) : (
        <Text style={styles.dailyHomeEmptyState}>{t('today.finishSetup')}</Text>
      )}
      <View style={styles.dailyHomeMacroRingRow}>
        <MacroRing
          label={t('macros.protein')}
          consumed={homeConsumedMacros.protein}
          target={dailyHomeTargets.macroAllowance.protein}
          color={tc.fg_0f766e}
        />
        <MacroRing
          label={t('macros.carbs')}
          consumed={homeConsumedMacros.carbs}
          target={dailyHomeTargets.macroAllowance.carbs}
          color={tc.fg_ea580c}
        />
        <MacroRing
          label={t('macros.fat')}
          consumed={homeConsumedMacros.fat}
          target={dailyHomeTargets.macroAllowance.fat}
          color={tc.fg_2563eb}
        />
      </View>
    </View>
  );
}
