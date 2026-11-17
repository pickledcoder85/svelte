import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useT } from '../i18n';
import { toneColor } from '../lib/app-format';
import type { MealPrepTask } from '../types';
import { styles } from './shared/styles';

export interface MealPrepScreenProps {
  mealPrepTone: 'checking' | 'live';
  mealPrepStatus: string;
  mealPrepError: string | null;
  mealPrepTasks: MealPrepTask[];
  cycleMealPrepStatus: (taskId: string) => Promise<void>;
  mealPrepSavingId: string | null;
}

export function MealPrepScreen({
  mealPrepTone,
  mealPrepStatus,
  mealPrepError,
  mealPrepTasks,
  cycleMealPrepStatus,
  mealPrepSavingId
}: MealPrepScreenProps): ReactElement {
  const t = useT();
  // Category and status are stored in English; only their labels translate.
  const statusKey = { Queued: 'queued', 'In progress': 'inProgress', Done: 'done' } as const;
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>{t('mealPrep.eyebrow')}</Text>
      <Text style={styles.panelTitle}>{t('mealPrep.title')}</Text>
      <Text style={styles.panelDetail}>{t('mealPrep.detail')}</Text>

      <View style={[styles.inlineStatus, { borderColor: toneColor(mealPrepTone) }]}>
        <Text style={styles.inlineStatusLabel}>{mealPrepStatus}</Text>
        {mealPrepError ? <Text style={styles.inlineStatusDetail}>{mealPrepError}</Text> : null}
      </View>

      <View style={styles.foodList}>
        {mealPrepTasks.map((task) => (
          <Pressable
            key={task.id}
            style={styles.foodRow}
            onPress={() => void cycleMealPrepStatus(task.id)}
            disabled={mealPrepSavingId === task.id}
          >
            <View style={styles.foodRowCopy}>
              <Text style={styles.listTitle}>{task.title}</Text>
              <Text style={styles.listCaption}>
                {t(`mealPrep.categories.${task.category}`)} · {task.portions}
              </Text>
            </View>
            <View style={styles.foodRowActions}>
              <Text style={styles.listMetric}>{mealPrepSavingId === task.id ? t('mealPrep.saving') : t(`mealPrep.statuses.${statusKey[task.status]}`)}</Text>
              <Text style={styles.listCaption}>{t('mealPrep.tapToCycle')}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
