import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

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
  return (
    <View style={styles.panel}>
      <Text style={styles.panelEyebrow}>Meal prep</Text>
      <Text style={styles.panelTitle}>Prep the week in batches</Text>
      <Text style={styles.panelDetail}>
        Track what to cook, portion, and assemble so the meal plan is realistic.
      </Text>

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
                {task.category} · {task.portions}
              </Text>
            </View>
            <View style={styles.foodRowActions}>
              <Text style={styles.listMetric}>{mealPrepSavingId === task.id ? 'Saving...' : task.status}</Text>
              <Text style={styles.listCaption}>Tap to cycle</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
