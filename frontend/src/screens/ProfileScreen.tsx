import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MetricTile } from '../components/MetricTile';
import type { AllergyChoice } from '../lib/allergies';
import { toneColor } from '../lib/app-format';
import { MEAL_STYLES, type MealStyleId } from '../lib/meal-split';
import { goalLabel, PACE_OPTIONS, type GoalPace } from '../lib/setup-goals';
import { tc } from '../theme/palette';
import type { UserGoal, UserProfile } from '../types';
import {
  allergyOptions,
  dietaryPatternOptions,
  nutritionStyleOptions,
  type DietaryPattern,
  type NutritionStyle
} from './shared/constants';
import { styles } from './shared/styles';

export interface ProfileScreenProps {
  profileTone: 'checking' | 'live';
  profileStatus: string;
  profileError: string | null;
  profile: UserProfile | null;
  onboardingSexDraft: 'male' | 'female' | null;
  setOnboardingSexDraft: Dispatch<SetStateAction<'male' | 'female' | null>>;
  onboardingAgeDraft: string;
  setOnboardingAgeDraft: Dispatch<SetStateAction<string>>;
  onboardingCurrentWeightDraft: string;
  setOnboardingCurrentWeightDraft: Dispatch<SetStateAction<string>>;
  onboardingHeightFeetDraft: string;
  setOnboardingHeightFeetDraft: Dispatch<SetStateAction<string>>;
  onboardingHeightInchesDraft: string;
  setOnboardingHeightInchesDraft: Dispatch<SetStateAction<string>>;
  onboardingGoalTypeDraft: 'lose' | 'maintain' | 'gain' | null;
  setOnboardingGoalTypeDraft: Dispatch<SetStateAction<'lose' | 'maintain' | 'gain' | null>>;
  onboardingGoalPaceDraft: GoalPace;
  setOnboardingGoalPaceDraft: Dispatch<SetStateAction<GoalPace>>;
  onboardingTargetWeightDraft: string;
  setOnboardingTargetWeightDraft: Dispatch<SetStateAction<string>>;
  onboardingActivityLevelDraft: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  setOnboardingActivityLevelDraft: Dispatch<
    SetStateAction<'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'>
  >;
  onboardingDietaryPatternDraft: DietaryPattern | null;
  setOnboardingDietaryPatternDraft: Dispatch<SetStateAction<DietaryPattern | null>>;
  onboardingNutritionStyleDraft: NutritionStyle | null;
  setOnboardingNutritionStyleDraft: Dispatch<SetStateAction<NutritionStyle | null>>;
  onboardingMealStyleDraft: MealStyleId;
  setOnboardingMealStyleDraft: Dispatch<SetStateAction<MealStyleId>>;
  onboardingAllergySelectionsDraft: AllergyChoice[];
  toggleOnboardingAllergy: (choice: AllergyChoice) => void;
  onboardingAllergyOtherDraft: string;
  setOnboardingAllergyOtherDraft: Dispatch<SetStateAction<string>>;
  saveProfileSettings: () => Promise<void>;
  profileSaving: boolean;
  latestProfileGoal: UserGoal | null;
  profileGoals: UserGoal[];
  goalEffectiveAtDraft: string;
  setGoalEffectiveAtDraft: Dispatch<SetStateAction<string>>;
  goalCaloriesDraft: string;
  setGoalCaloriesDraft: Dispatch<SetStateAction<string>>;
  goalProteinDraft: string;
  setGoalProteinDraft: Dispatch<SetStateAction<string>>;
  goalCarbsDraft: string;
  setGoalCarbsDraft: Dispatch<SetStateAction<string>>;
  goalFatDraft: string;
  setGoalFatDraft: Dispatch<SetStateAction<string>>;
  goalWeightDraft: string;
  setGoalWeightDraft: Dispatch<SetStateAction<string>>;
  addGoal: () => Promise<void>;
  goalSaving: boolean;
}

export function ProfileScreen({
  profileTone,
  profileStatus,
  profileError,
  profile,
  onboardingSexDraft,
  setOnboardingSexDraft,
  onboardingAgeDraft,
  setOnboardingAgeDraft,
  onboardingCurrentWeightDraft,
  setOnboardingCurrentWeightDraft,
  onboardingHeightFeetDraft,
  setOnboardingHeightFeetDraft,
  onboardingHeightInchesDraft,
  setOnboardingHeightInchesDraft,
  onboardingGoalTypeDraft,
  setOnboardingGoalTypeDraft,
  onboardingGoalPaceDraft,
  setOnboardingGoalPaceDraft,
  onboardingTargetWeightDraft,
  setOnboardingTargetWeightDraft,
  onboardingActivityLevelDraft,
  setOnboardingActivityLevelDraft,
  onboardingDietaryPatternDraft,
  setOnboardingDietaryPatternDraft,
  onboardingNutritionStyleDraft,
  setOnboardingNutritionStyleDraft,
  onboardingMealStyleDraft,
  setOnboardingMealStyleDraft,
  onboardingAllergySelectionsDraft,
  toggleOnboardingAllergy,
  onboardingAllergyOtherDraft,
  setOnboardingAllergyOtherDraft,
  saveProfileSettings,
  profileSaving,
  latestProfileGoal,
  profileGoals,
  goalEffectiveAtDraft,
  setGoalEffectiveAtDraft,
  goalCaloriesDraft,
  setGoalCaloriesDraft,
  goalProteinDraft,
  setGoalProteinDraft,
  goalCarbsDraft,
  setGoalCarbsDraft,
  goalFatDraft,
  setGoalFatDraft,
  goalWeightDraft,
  setGoalWeightDraft,
  addGoal,
  goalSaving
}: ProfileScreenProps): ReactElement {
  return (
    <>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelEyebrow}>Profile</Text>
            <Text style={styles.panelTitle}>Your body and goals</Text>
          </View>
          <Text style={styles.panelDetail}>Update your weight, body stats, and goal here; your daily targets recalculate when you save. Units, time zone, and your name are in Settings.</Text>
        </View>

        <View style={[styles.inlineStatus, { borderColor: toneColor(profileTone) }]}>
          <Text style={styles.inlineStatusLabel}>{profileStatus}</Text>
          {profileError ? <Text style={styles.inlineStatusDetail}>{profileError}</Text> : null}
        </View>

        {profile ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Body and goal</Text>

            <View style={styles.profileFieldStack}>
              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Sex</Text>
                <View style={styles.profileToggleRow}>
                  {(['female', 'male'] as const).map((option) => {
                    const active = onboardingSexDraft === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingSexDraft(option)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                          {option === 'male' ? 'Male' : 'Female'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Age</Text>
                  <TextInput
                    value={onboardingAgeDraft}
                    onChangeText={setOnboardingAgeDraft}
                    keyboardType="numeric"
                    placeholder="34"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.profileFieldInput}
                  />
                </View>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Current weight, lb</Text>
                  <TextInput
                    value={onboardingCurrentWeightDraft}
                    onChangeText={setOnboardingCurrentWeightDraft}
                    keyboardType="decimal-pad"
                    placeholder="180"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.profileFieldInput}
                  />
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Height, ft</Text>
                  <TextInput
                    value={onboardingHeightFeetDraft}
                    onChangeText={setOnboardingHeightFeetDraft}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.profileFieldInput}
                  />
                </View>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Height, in</Text>
                  <TextInput
                    value={onboardingHeightInchesDraft}
                    onChangeText={setOnboardingHeightInchesDraft}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.profileFieldInput}
                  />
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Goal</Text>
                <View style={styles.profileToggleRow}>
                  {(['lose', 'maintain', 'gain'] as const).map((option) => {
                    const active = onboardingGoalTypeDraft === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingGoalTypeDraft(option)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                          {goalLabel(option)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>{onboardingGoalTypeDraft === 'maintain' ? 'Focus' : 'Pace'}</Text>
                <View style={styles.profileToggleRow}>
                  {(onboardingGoalTypeDraft ? PACE_OPTIONS[onboardingGoalTypeDraft] : []).map((option) => {
                    const active = onboardingGoalPaceDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingGoalPaceDraft(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                          {option.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileFieldRow}>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Target weight, lb</Text>
                  <TextInput
                    value={onboardingTargetWeightDraft}
                    onChangeText={setOnboardingTargetWeightDraft}
                    keyboardType="decimal-pad"
                    placeholder="170"
                    placeholderTextColor={tc.fg_7c8aa5}
                    style={styles.profileFieldInput}
                  />
                </View>
                <View style={styles.profileFieldHalf}>
                  <Text style={styles.profileFieldLabel}>Activity level</Text>
                  <View style={styles.profileToggleRow}>
                    {(['sedentary', 'light', 'moderate', 'very_active', 'extra_active'] as const).map((option) => {
                      const active = onboardingActivityLevelDraft === option;
                      return (
                        <Pressable
                          key={option}
                          style={[styles.profileToggle, active && styles.profileToggleActive]}
                          onPress={() => setOnboardingActivityLevelDraft(option)}
                        >
                          <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>
                            {option === 'very_active'
                              ? 'Very active'
                              : option === 'extra_active'
                                ? 'Extra active'
                                : option === 'sedentary'
                                  ? 'Sedentary'
                                  : option === 'light'
                                    ? 'Light'
                                    : 'Moderate'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>How you eat</Text>
                <View style={styles.profileToggleRow}>
                  {dietaryPatternOptions.map((option) => {
                    const active = onboardingDietaryPatternDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingDietaryPatternDraft(option.id)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Nutrition style</Text>
                <View style={styles.profileToggleRow}>
                  {nutritionStyleOptions.map((option) => {
                    const active = onboardingNutritionStyleDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingNutritionStyleDraft(option.id)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Meal balance</Text>
                <View style={styles.profileToggleRow}>
                  {MEAL_STYLES.map((option) => {
                    const active = onboardingMealStyleDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => setOnboardingMealStyleDraft(option.id)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.profileField}>
                <Text style={styles.profileFieldLabel}>Avoid</Text>
                <View style={styles.profileToggleRow}>
                  {allergyOptions.map((option) => {
                    const active = onboardingAllergySelectionsDraft.includes(option.id);
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.profileToggle, active && styles.profileToggleActive]}
                        onPress={() => toggleOnboardingAllergy(option.id)}
                      >
                        <Text style={[styles.profileToggleLabel, active && styles.profileToggleLabelActive]}>{option.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {onboardingAllergySelectionsDraft.includes('other') ? (
                  <TextInput
                    value={onboardingAllergyOtherDraft}
                    onChangeText={setOnboardingAllergyOtherDraft}
                    placeholder="For example sesame or soy"
                    placeholderTextColor={tc.fg_9aa6b8}
                    style={styles.settingsInput}
                  />
                ) : null}
              </View>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => void saveProfileSettings()}
              disabled={profileSaving}
            >
              <Text style={styles.primaryButtonLabel}>
                {profileSaving ? 'Saving...' : 'Save profile and recalculate targets'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Goals</Text>
        <Text style={styles.panelTitle}>Target management</Text>
        <Text style={styles.panelDetail}>The profile form above now drives the active targets. Manual goal entries remain available below for temporary overrides or experiments.</Text>

        {latestProfileGoal ? (
          <View style={styles.detailCard}>
            <View style={styles.recipeRowTitleWrap}>
              <View>
                <Text style={styles.panelEyebrow}>Active target</Text>
                <Text style={styles.detailTitle}>Latest generated target block</Text>
              </View>
              <Text style={styles.detailSubtitle}>{latestProfileGoal.effective_at}</Text>
            </View>
            <View style={styles.metricRow}>
              <MetricTile label="Calories" value={`${latestProfileGoal.calorie_goal} kcal`} />
              <MetricTile label="Protein" value={`${latestProfileGoal.protein_goal} g`} />
              <MetricTile label="Carbs" value={`${latestProfileGoal.carbs_goal} g`} />
              <MetricTile label="Fat" value={`${latestProfileGoal.fat_goal} g`} />
            </View>
          </View>
        ) : null}

        <View style={styles.foodList}>
          {profileGoals.length > 0 ? (
            profileGoals.map((goal, index) => (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.recipeRowTitleWrap}>
                  <Text style={styles.listTitle}>
                    Goal {profileGoals.length - index}
                  </Text>
                  <Text style={styles.listCaption}>{goal.effective_at}</Text>
                </View>
                <View style={styles.goalMetaRow}>
                  <Text style={styles.goalMetaChip}>{goal.calorie_goal} kcal</Text>
                  <Text style={styles.goalMetaChip}>{goal.protein_goal}P</Text>
                  <Text style={styles.goalMetaChip}>{goal.carbs_goal}C</Text>
                  <Text style={styles.goalMetaChip}>{goal.fat_goal}F</Text>
                  {goal.target_weight_lbs !== null ? (
                    <Text style={styles.goalMetaChip}>{goal.target_weight_lbs} lb</Text>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>No goals saved yet</Text>
              <Text style={styles.detailSubtitle}>Create a starting target block below to populate this list.</Text>
            </View>
          )}
        </View>

        <View style={styles.profileFieldStack}>
          <View style={styles.profileField}>
            <Text style={styles.profileFieldLabel}>Effective date</Text>
            <TextInput
              value={goalEffectiveAtDraft}
              onChangeText={setGoalEffectiveAtDraft}
              placeholder="2026-03-30"
              placeholderTextColor={tc.fg_7c8aa5}
              style={styles.profileFieldInput}
            />
          </View>

          <View style={styles.profileFieldRow}>
            <View style={styles.profileFieldHalf}>
              <Text style={styles.profileFieldLabel}>Calories</Text>
              <TextInput
                value={goalCaloriesDraft}
                onChangeText={setGoalCaloriesDraft}
                placeholder="2100"
                placeholderTextColor={tc.fg_7c8aa5}
                keyboardType="numeric"
                style={styles.profileFieldInput}
              />
            </View>
            <View style={styles.profileFieldHalf}>
              <Text style={styles.profileFieldLabel}>Protein</Text>
              <TextInput
                value={goalProteinDraft}
                onChangeText={setGoalProteinDraft}
                placeholder="180"
                placeholderTextColor={tc.fg_7c8aa5}
                keyboardType="numeric"
                style={styles.profileFieldInput}
              />
            </View>
          </View>

          <View style={styles.profileFieldRow}>
            <View style={styles.profileFieldHalf}>
              <Text style={styles.profileFieldLabel}>Carbs</Text>
              <TextInput
                value={goalCarbsDraft}
                onChangeText={setGoalCarbsDraft}
                placeholder="190"
                placeholderTextColor={tc.fg_7c8aa5}
                keyboardType="numeric"
                style={styles.profileFieldInput}
              />
            </View>
            <View style={styles.profileFieldHalf}>
              <Text style={styles.profileFieldLabel}>Fat</Text>
              <TextInput
                value={goalFatDraft}
                onChangeText={setGoalFatDraft}
                placeholder="60"
                placeholderTextColor={tc.fg_7c8aa5}
                keyboardType="numeric"
                style={styles.profileFieldInput}
              />
            </View>
          </View>

          <View style={styles.profileField}>
            <Text style={styles.profileFieldLabel}>Target weight, lb</Text>
            <TextInput
              value={goalWeightDraft}
              onChangeText={setGoalWeightDraft}
              placeholder="178.5"
              placeholderTextColor={tc.fg_7c8aa5}
              keyboardType="numeric"
              style={styles.profileFieldInput}
            />
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => void addGoal()}
            disabled={goalSaving}
          >
            <Text style={styles.primaryButtonLabel}>{goalSaving ? 'Saving...' : 'Add goal'}</Text>
          </Pressable>
        </View>
      </View>

    </>
  );
}
