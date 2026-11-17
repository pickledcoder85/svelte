import { StatusBar } from 'expo-status-bar';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

import { ActivityCaption, ActivityEnergyBars, ActivitySlider } from '../../components/ActivityLevel';
import { ChoiceSheet } from '../../components/ChoiceSheet';
import { FieldGroup, PickerField } from '../../components/FormField';
import { PickerSheet } from '../../components/PickerSheet';
import type { ActivityLevel } from '../../lib/activity-level';
import { formatAllergySelection, type AllergyChoice } from '../../lib/allergies';
import { firstName, formatGoalPaceLabel, formatGoalTypeLabel, toneColor } from '../../lib/app-format';
import { bodyMeasurementsFromDrafts, type BodyDrafts, type UnitSystem } from '../../lib/body-units';
import { MEAL_STYLES, type MealStyleId } from '../../lib/meal-split';
import {
  DEFAULT_PACE,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  caloriesToMoveMore,
  estimateGoalDate,
  formatApproximateDate,
  formatCalories,
  formatWeeklyRate,
  paceDisplay,
  VERY_LOW_CALORIE_LIMIT,
  type CalorieFloorChoice,
  type GoalPace,
  type GoalType,
  type PaceDisplay,
  type TargetPreview,
  type TargetPreviewOption
} from '../../lib/setup-goals';
import { formatBodyField, initialWheelIndexes, wheelColumns, type BodyField, type WheelDrafts } from '../../lib/wheel-picker';
import { tc } from '../../theme/palette';
import {
  activityLevelCards,
  allergyOptions,
  dietaryPatternOptions,
  mascotDefaultImage,
  mascotRunImage,
  mascotWeightsImage,
  nutritionStyleOptions,
  onboardingSteps,
  type DietaryPattern,
  type NutritionStyle,
  type OnboardingStep
} from '../shared/constants';
import { styles } from '../shared/styles';

export interface OnboardingWizardProps {
  onboardingStep: OnboardingStep;
  setOnboardingStep: Dispatch<SetStateAction<OnboardingStep>>;
  onboardingSaving: boolean;
  onboardingError: string | null;
  setOnboardingError: Dispatch<SetStateAction<string | null>>;
  floorWarning: { pace: GoalPace; thenNext: boolean } | null;
  setFloorWarning: Dispatch<SetStateAction<{ pace: GoalPace; thenNext: boolean } | null>>;
  calculatedPaceOption: (pace?: GoalPace) => TargetPreviewOption | null;
  effectivePaceOption: (goal?: GoalType | null, pace?: GoalPace) => TargetPreviewOption | null;
  displayedPace: (goal?: GoalType | null, pace?: GoalPace) => PaceDisplay | null;
  floorAnswered: (pace: GoalPace) => boolean;
  chooseOnboardingPace: (pace: GoalPace) => void;
  answerFloorWarning: (choice: CalorieFloorChoice) => void;
  targetPreview: TargetPreview | null;
  energyPreview: TargetPreview | null;
  energyMaintenance: number | null;
  onboardingSexDraft: 'male' | 'female' | null;
  setOnboardingSexDraft: Dispatch<SetStateAction<'male' | 'female' | null>>;
  onboardingGoalTypeDraft: GoalType | null;
  setOnboardingGoalTypeDraft: Dispatch<SetStateAction<GoalType | null>>;
  onboardingGoalPaceDraft: GoalPace;
  onboardingCalorieFloorDraft: CalorieFloorChoice;
  bodyPicker: BodyField | null;
  setBodyPicker: Dispatch<SetStateAction<BodyField | null>>;
  applyBodyPicker: (field: BodyField, indexes: number[]) => void;
  onboardingUnitsDraft: UnitSystem;
  switchOnboardingUnits: (next: UnitSystem) => void;
  onboardingWheelDrafts: () => WheelDrafts;
  onboardingBodyDrafts: () => BodyDrafts;
  onboardingTargetWeightLbs: () => number | null;
  setOnboardingTargetWeightDraft: Dispatch<SetStateAction<string>>;
  profileDisplayNameDraft: string;
  setProfileDisplayNameDraft: Dispatch<SetStateAction<string>>;
  onboardingActivityLevelDraft: ActivityLevel;
  setOnboardingActivityLevelDraft: Dispatch<SetStateAction<ActivityLevel>>;
  showBmrExplainer: boolean;
  setShowBmrExplainer: Dispatch<SetStateAction<boolean>>;
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
  goToPreviousOnboardingStep: () => void;
  goToNextOnboardingStep: () => void;
  completeOnboardingSetup: () => Promise<void>;
}

export function OnboardingWizard({
  onboardingStep,
  setOnboardingStep,
  onboardingSaving,
  onboardingError,
  setOnboardingError,
  floorWarning,
  setFloorWarning,
  calculatedPaceOption,
  effectivePaceOption,
  displayedPace,
  floorAnswered,
  chooseOnboardingPace,
  answerFloorWarning,
  targetPreview,
  energyPreview,
  energyMaintenance,
  onboardingSexDraft,
  setOnboardingSexDraft,
  onboardingGoalTypeDraft,
  setOnboardingGoalTypeDraft,
  onboardingGoalPaceDraft,
  onboardingCalorieFloorDraft,
  bodyPicker,
  setBodyPicker,
  applyBodyPicker,
  onboardingUnitsDraft,
  switchOnboardingUnits,
  onboardingWheelDrafts,
  onboardingBodyDrafts,
  onboardingTargetWeightLbs,
  setOnboardingTargetWeightDraft,
  profileDisplayNameDraft,
  setProfileDisplayNameDraft,
  onboardingActivityLevelDraft,
  setOnboardingActivityLevelDraft,
  showBmrExplainer,
  setShowBmrExplainer,
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
  goToPreviousOnboardingStep,
  goToNextOnboardingStep,
  completeOnboardingSetup
}: OnboardingWizardProps): ReactElement {
  const activeStepIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
  const currentStepLabel = onboardingSteps[activeStepIndex]?.label ?? 'Basics';
  const showOnboardingStatus = onboardingSaving || Boolean(onboardingError);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.setupBackdrop}>
            <View style={styles.setupCard}>
              <View
                style={styles.setupProgress}
                accessibilityRole="progressbar"
                accessibilityLabel={`Step ${activeStepIndex + 1} of ${onboardingSteps.length}: ${currentStepLabel}`}
              >
                <View style={styles.setupProgressTrack}>
                  {onboardingSteps.map((step, index) => (
                    <View
                      key={step.id}
                      style={[styles.setupProgressSegment, index <= activeStepIndex && styles.setupProgressSegmentDone]}
                    />
                  ))}
                </View>
                <Text style={styles.setupProgressCount}>
                  {activeStepIndex + 1} of {onboardingSteps.length}
                </Text>
              </View>

              {showOnboardingStatus ? (
                <View
                  style={[
                    styles.inlineStatus,
                    { borderColor: onboardingSaving ? toneColor('checking') : tc.line_d97706 }
                  ]}
                >
                  <Text style={styles.inlineStatusLabel}>
                    {onboardingSaving ? 'Saving profile...' : 'There is a setup issue to fix'}
                  </Text>
                  {onboardingError ? <Text style={styles.inlineStatusDetail}>{onboardingError}</Text> : null}
                </View>
              ) : null}

            {floorWarning ? (
              (() => {
                const pending = calculatedPaceOption(floorWarning.pace);
                const minimum = targetPreview?.recommended_minimum_calories ?? 1200;
                const calculatedCalories = Math.round(pending?.calorie_target ?? 0);
                const who = onboardingSexDraft === 'male' ? 'men' : 'women';
                return (
                  <ChoiceSheet
                    title="Below the recommended minimum"
                    primaryLabel={`Use ${minimum.toLocaleString('en-US')} kcal`}
                    primaryDetail="Recommended"
                    secondaryLabel={`Keep ${calculatedCalories.toLocaleString('en-US')} kcal`}
                    secondaryDetail="Opt out of the minimum"
                    onPrimary={() => answerFloorWarning('recommended')}
                    onSecondary={() => answerFloorWarning('off')}
                    onDismiss={() => setFloorWarning(null)}
                  >
                    <View style={styles.floorCompare}>
                      <View style={styles.floorCompareTile}>
                        <Text style={styles.floorCompareLabel}>
                          {onboardingGoalTypeDraft === 'maintain' ? 'Maintaining' : 'This pace'}
                        </Text>
                        <Text style={[styles.floorCompareValue, styles.paceRowCaloriesBelow]}>
                          {calculatedCalories.toLocaleString('en-US')} kcal
                        </Text>
                      </View>
                      <View style={styles.floorCompareTile}>
                        <Text style={styles.floorCompareLabel}>Recommended minimum</Text>
                        <Text style={styles.floorCompareValue}>{minimum.toLocaleString('en-US')} kcal</Text>
                        <Text style={styles.floorCompareNote}>for {who}</Text>
                      </View>
                    </View>
                    <Text style={styles.floorWarningText}>
                      Going lower without a doctor makes it hard to get enough protein and nutrients, and raises the risk
                      of muscle loss, fatigue, and regaining the weight.
                    </Text>
                    {pending && caloriesToMoveMore(pending, minimum) > 0 ? (
                      <View style={styles.floorTip}>
                        <Text style={styles.floorWarningText}>
                          <Text style={styles.floorWarningStrong}>Better:</Text> eat {minimum.toLocaleString('en-US')} kcal and burn
                          the other {caloriesToMoveMore(pending, minimum).toLocaleString('en-US')} kcal by moving more, like a longer
                          daily walk.
                        </Text>
                      </View>
                    ) : null}
                    {calculatedCalories < VERY_LOW_CALORIE_LIMIT ? (
                      <Text style={styles.floorWarningText}>
                        Under {VERY_LOW_CALORIE_LIMIT} kcal a day is a very-low-calorie diet, normally done only with medical
                        supervision.
                      </Text>
                    ) : null}
                    <Text style={styles.floorWarningHint}>Opting out turns off the minimum. You can change it in Settings.</Text>
                  </ChoiceSheet>
                );
              })()
            ) : null}

            {bodyPicker ? (
              <PickerSheet
                key={`${bodyPicker}-${onboardingUnitsDraft}`}
                title={{ height: 'Height', weight: 'Weight', goalWeight: 'Goal weight', age: 'Age' }[bodyPicker]}
                columns={wheelColumns(bodyPicker, onboardingUnitsDraft)}
                initialIndexes={initialWheelIndexes(
                  bodyPicker,
                  onboardingUnitsDraft,
                  onboardingWheelDrafts(),
                  onboardingGoalTypeDraft ?? 'maintain'
                )}
                onDone={(indexes) => applyBodyPicker(bodyPicker, indexes)}
                onCancel={() => setBodyPicker(null)}
                {...(bodyPicker === 'goalWeight'
                  ? {
                      clearLabel: 'No goal weight',
                      onClear: () => {
                        setOnboardingTargetWeightDraft('');
                        setBodyPicker(null);
                      }
                    }
                  : {})}
              />
            ) : null}

            {onboardingStep === 'basics' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>About you</Text>
                <Text style={styles.setupIntroText}>
                  We use these to estimate how many calories your body uses each day.
                </Text>

                <View style={styles.unitToggle} accessibilityRole="radiogroup" accessibilityLabel="Units">
                  {(
                    [
                      { id: 'imperial' as const, label: 'lb · ft/in' },
                      { id: 'metric' as const, label: 'kg · cm' }
                    ]
                  ).map((option) => {
                    const active = onboardingUnitsDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.unitToggleOption, active && styles.unitToggleOptionActive]}
                        onPress={() => switchOnboardingUnits(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={[styles.unitToggleLabel, active && styles.unitToggleLabelActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <FieldGroup label="Your name">
                  <TextInput
                    value={profileDisplayNameDraft}
                    onChangeText={setProfileDisplayNameDraft}
                    placeholder="What should I call you?"
                    placeholderTextColor={tc.fg_9aa6b8}
                    style={styles.settingsInput}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    maxLength={60}
                    accessibilityLabel="Your name"
                  />
                </FieldGroup>

                <FieldGroup label="Sex">
                  <View style={styles.setupSegmentRow} accessibilityRole="radiogroup">
                    {(['female', 'male'] as const).map((option) => {
                      const active = onboardingSexDraft === option;
                      return (
                        <Pressable
                          key={option}
                          style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                          onPress={() => setOnboardingSexDraft(option)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                        >
                          <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>
                            {option === 'male' ? 'Male' : 'Female'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </FieldGroup>

                <PickerField
                  label="Height"
                  value={formatBodyField('height', onboardingUnitsDraft, onboardingWheelDrafts())}
                  placeholder="Choose"
                  onPress={() => setBodyPicker('height')}
                  accessibilityLabel="Height"
                />

                <View style={styles.profileFieldRow}>
                  <PickerField
                    style={styles.profileFieldHalf}
                    label="Weight"
                    value={formatBodyField('weight', onboardingUnitsDraft, onboardingWheelDrafts())}
                    placeholder="Choose"
                    onPress={() => setBodyPicker('weight')}
                    accessibilityLabel="Weight"
                  />
                  <PickerField
                    style={styles.profileFieldHalf}
                    label="Age"
                    value={formatBodyField('age', onboardingUnitsDraft, onboardingWheelDrafts())}
                    placeholder="Choose"
                    onPress={() => setBodyPicker('age')}
                    accessibilityLabel="Age"
                  />
                </View>
              </View>
            ) : null}

            {onboardingStep === 'activity' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>Daily activity</Text>
                <Text style={styles.setupIntroText}>
                  Count everyday movement like walking, chores, and your job. Workouts are tracked separately.
                </Text>

                <ActivityEnergyBars
                  bmr={energyPreview?.bmr_calories ?? null}
                  maintenance={energyMaintenance}
                  maintenanceByLevel={energyPreview?.maintenance_by_activity}
                />

                <ActivityCaption value={onboardingActivityLevelDraft} />

                {/* The control sits under what it changes, by the thumb. */}
                <ActivitySlider value={onboardingActivityLevelDraft} onChange={setOnboardingActivityLevelDraft} />

                <Pressable
                  onPress={() => setShowBmrExplainer((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel="What's BMR?"
                  accessibilityState={{ expanded: showBmrExplainer }}
                  hitSlop={12}
                  style={styles.bmrLinkButton}
                >
                  <Text style={styles.bmrLink}>{showBmrExplainer ? 'Hide BMR info' : "What's BMR?"}</Text>
                </Pressable>
                {showBmrExplainer ? (
                  <Text style={styles.bmrExplainer}>
                    BMR (basal metabolic rate) is the energy your body needs at complete rest: breathing, circulation, staying
                    warm. Relish estimates it from your height, weight, age, and sex with the Mifflin-St Jeor formula. With
                    your activity added, that is about what you burn in a day: eat that much and your weight stays put.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {onboardingStep === 'goal' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>Your goal</Text>
                {targetPreview ? (
                  <Text style={styles.setupIntroText}>
                    You burn about {formatCalories(targetPreview.maintenance_calories)}.
                  </Text>
                ) : null}

                <View style={styles.setupGoalGrid}>
                  {GOAL_OPTIONS.map((option) => {
                    const active = onboardingGoalTypeDraft === option.id;
                    const preview = displayedPace(option.id, DEFAULT_PACE[option.id]);
                    const image =
                      option.id === 'lose' ? mascotRunImage : option.id === 'gain' ? mascotWeightsImage : mascotDefaultImage;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupGoalCard, active && styles.setupGoalCardActive]}
                        onPress={() => setOnboardingGoalTypeDraft(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Image source={image} style={styles.setupGoalImage} resizeMode="contain" />
                        <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{option.title}</Text>
                        <Text style={styles.setupChoiceDetail}>{option.detail}</Text>
                        {preview ? (
                          <Text
                            style={[
                              styles.setupGoalCalories,
                              (preview.state === 'below' || preview.state === 'opted_out') && styles.paceRowCaloriesBelow
                            ]}
                          >
                            About {formatCalories(preview.calories)}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'pace' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>
                  {onboardingGoalTypeDraft === 'maintain' ? 'Your focus' : 'How fast?'}
                </Text>
                <Text style={styles.setupIntroText}>
                  {onboardingGoalTypeDraft === 'maintain'
                    ? 'Same calories either way. Your focus changes how they split between protein, carbs, and fat.'
                    : 'A slower pace is easier to keep up. You can change it any time.'}
                </Text>

                <View style={styles.setupOptionStack}>
                  {(onboardingGoalTypeDraft ? PACE_OPTIONS[onboardingGoalTypeDraft] : []).map((option) => {
                    const active = onboardingGoalPaceDraft === option.id;
                    const calculated = calculatedPaceOption(option.id);
                    const minimum = targetPreview?.recommended_minimum_calories ?? 1200;
                    // The honest number until the user decides; red when below the minimum.
                    const display = calculated
                      ? paceDisplay(calculated, onboardingCalorieFloorDraft, floorAnswered(option.id))
                      : null;
                    const rate =
                      display && onboardingGoalTypeDraft !== 'maintain'
                        ? formatWeeklyRate(display.weeklyChangeLbs, onboardingUnitsDraft)
                        : '';
                    // The recommended minimum can turn a loss pace into a small surplus.
                    const wrongDirection =
                      display !== null &&
                      ((onboardingGoalTypeDraft === 'lose' && display.weeklyChangeLbs >= 0) ||
                        (onboardingGoalTypeDraft === 'gain' && display.weeklyChangeLbs <= 0));
                    const belowShown = display?.state === 'below' || display?.state === 'opted_out';
                    const kcal = (value: number) => `${Math.round(value).toLocaleString('en-US')} kcal`;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupOptionRow, active && styles.setupOptionRowActive]}
                        onPress={() => chooseOnboardingPace(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <View style={styles.paceRowHeader}>
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {option.title}
                          </Text>
                          {display ? (
                            <Text style={[styles.paceRowCalories, belowShown && styles.paceRowCaloriesBelow]}>
                              {formatCalories(display.calories)}
                            </Text>
                          ) : null}
                        </View>
                        {rate && !wrongDirection ? (
                          <Text style={styles.setupChoiceDetail}>
                            {display && display.weeklyChangeLbs < 0 ? 'Lose ' : 'Gain '}
                            {rate}
                          </Text>
                        ) : null}
                        {option.note ? <Text style={styles.setupGoalNote}>{option.note}</Text> : null}
                        {display?.state === 'below' ? (
                          <Text style={styles.paceRowWarning}>Below the {kcal(minimum)} recommended minimum</Text>
                        ) : display?.state === 'opted_out' ? (
                          <Text style={styles.paceRowWarning}>Below the {kcal(minimum)} recommended minimum (floor off)</Text>
                        ) : display?.state === 'using_minimum' ? (
                          <Text style={styles.setupChoiceDetail}>
                            Calculated {kcal(display.calculatedCalories)} · using the recommended minimum
                          </Text>
                        ) : null}
                        {wrongDirection ? (
                          <Text style={styles.paceRowWarning}>
                            At the {kcal(minimum)} minimum you would not lose weight, because it is above what you burn. Move
                            more to keep this pace, or tap this pace to opt out of the minimum.
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {onboardingGoalTypeDraft !== 'maintain' ? (
                  <View style={styles.goalWeightBlock}>
                    <PickerField
                      label="Goal weight (optional)"
                      value={formatBodyField('goalWeight', onboardingUnitsDraft, onboardingWheelDrafts())}
                      placeholder="Choose"
                      onPress={() => setBodyPicker('goalWeight')}
                      accessibilityLabel="Goal weight"
                    />
                    {(() => {
                      const goalLbs = onboardingTargetWeightLbs();
                      const current = bodyMeasurementsFromDrafts(onboardingUnitsDraft, onboardingBodyDrafts());
                      // The same rate the selected card shows.
                      const preview = displayedPace();
                      if (goalLbs === null || !current || !preview) {
                        return null;
                      }
                      const goalOnRightSide =
                        onboardingGoalTypeDraft === 'lose' ? goalLbs < current.weight_lbs : goalLbs > current.weight_lbs;
                      const estimate = estimateGoalDate(current.weight_lbs, goalLbs, preview.weeklyChangeLbs);
                      if (goalOnRightSide && !estimate) {
                        return null;
                      }
                      return estimate ? (
                        <Text style={styles.goalWeightEstimate}>
                          At this pace: about {estimate.weeks} {estimate.weeks === 1 ? 'week' : 'weeks'}, around{' '}
                          {formatApproximateDate(estimate.date)}.
                        </Text>
                      ) : (
                        <Text style={styles.paceRowWarning}>
                          {onboardingGoalTypeDraft === 'lose'
                            ? 'Goal weight should be below your current weight.'
                            : 'Goal weight should be above your current weight.'}
                        </Text>
                      );
                    })()}
                  </View>
                ) : null}
              </View>
            ) : null}

            {onboardingStep === 'diet' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>How you eat</Text>
                <Text style={styles.setupIntroText}>
                  Helps Relish suggest foods and meals that fit. It doesn't change your calories.
                </Text>
                <View style={styles.setupOptionStack} accessibilityRole="radiogroup">
                  {dietaryPatternOptions.map((option) => {
                    const active = onboardingDietaryPatternDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupOptionRow, styles.setupIconRow, active && styles.setupOptionRowActive]}
                        onPress={() => setOnboardingDietaryPatternDraft(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={styles.setupIcon} accessibilityElementsHidden importantForAccessibility="no">
                          {option.icon}
                        </Text>
                        <View style={styles.setupIconRowCopy}>
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{option.title}</Text>
                          <Text style={styles.setupChoiceDetail}>{option.subtitle}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'style' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>Nutrition style</Text>
                <Text style={styles.setupIntroText}>The kind of eating you prefer. You can change it any time in Profile.</Text>
                <View style={styles.setupOptionStack} accessibilityRole="radiogroup">
                  {nutritionStyleOptions.map((option) => {
                    const active = onboardingNutritionStyleDraft === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupOptionRow, styles.setupIconRow, active && styles.setupOptionRowActive]}
                        onPress={() => setOnboardingNutritionStyleDraft(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={styles.setupIcon} accessibilityElementsHidden importantForAccessibility="no">
                          {option.icon}
                        </Text>
                        <View style={styles.setupIconRowCopy}>
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{option.title}</Text>
                          <Text style={styles.setupChoiceDetail}>{option.subtitle}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'balance' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>How do you balance your meals?</Text>
                <Text style={styles.setupIntroText}>
                  How your day's calories split across breakfast, lunch, and dinner. Gus uses it to size the meals he plans. You can
                  change it any time in Profile.
                </Text>
                <View style={styles.setupOptionStack} accessibilityRole="radiogroup">
                  {MEAL_STYLES.map((option) => {
                    const active = onboardingMealStyleDraft === option.id;
                    const [breakfast, lunch, dinner] = option.splits[3];
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.setupOptionRow, active && styles.setupOptionRowActive]}
                        onPress={() => setOnboardingMealStyleDraft(option.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <View style={styles.setupIconRowCopy}>
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {option.label}
                            {option.id === 'balanced' ? ' (default)' : ''}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>{option.detail}</Text>
                          <Text style={styles.setupChoiceDetail}>
                            Breakfast {breakfast}% · Lunch {lunch}% · Dinner {dinner}%
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'allergies' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>Allergies and foods to avoid</Text>
                <Text style={styles.setupIntroText}>Pick all that apply, or None. Saved to your profile.</Text>
                {/* Two columns of compact tiles, so all eight fit on a phone screen. */}
                <View style={styles.allergyGrid}>
                  {allergyOptions.map((option) => {
                    const active = onboardingAllergySelectionsDraft.includes(option.id);
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.allergyTile, active && styles.setupOptionRowActive]}
                        onPress={() => toggleOnboardingAllergy(option.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={option.title}
                      >
                        <Text style={styles.allergyIcon} accessibilityElementsHidden importantForAccessibility="no">
                          {option.icon}
                        </Text>
                        <Text
                          style={[styles.allergyLabel, active && styles.setupChoiceTitleActive]}
                          numberOfLines={1}
                        >
                          {option.title}
                        </Text>
                        <View style={[styles.setupCheckBox, styles.allergyCheck, active && styles.setupCheckBoxActive]}>
                          {active ? <Text style={styles.setupCheckMark}>✓</Text> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {onboardingAllergySelectionsDraft.includes('other') ? (
                  <FieldGroup label="Other">
                    <TextInput
                      value={onboardingAllergyOtherDraft}
                      onChangeText={setOnboardingAllergyOtherDraft}
                      placeholder="For example sesame or soy"
                      placeholderTextColor={tc.fg_9aa6b8}
                      style={styles.settingsInput}
                    />
                  </FieldGroup>
                ) : null}
              </View>
            ) : null}

            {onboardingStep === 'review' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>
                  {firstName(profileDisplayNameDraft) ? `Looking good, ${firstName(profileDisplayNameDraft)}!` : 'Looking good!'}
                </Text>
                <Text style={styles.setupIntroText}>
                  Check everything, then create your profile. You can change any of this later.
                </Text>

                {effectivePaceOption() ? (
                  <View style={styles.reviewTarget}>
                    <Text style={styles.reviewTargetLabel}>Your daily target</Text>
                    <Text style={styles.reviewTargetValue}>{formatCalories(effectivePaceOption()?.calorie_target ?? 0)}</Text>
                    <Text style={styles.reviewTargetMacros}>
                      Protein {Math.round(effectivePaceOption()?.protein_target_g ?? 0)} g · Carbs{' '}
                      {Math.round(effectivePaceOption()?.carbs_target_g ?? 0)} g · Fat {Math.round(effectivePaceOption()?.fat_target_g ?? 0)} g
                    </Text>
                    {onboardingCalorieFloorDraft === 'off' ? (
                      <Text style={styles.paceRowWarning}>
                        {calculatedPaceOption()?.below_recommended_minimum
                          ? 'Below the recommended minimum (calorie floor off)'
                          : 'Calorie floor off: future targets can go below the recommended minimum'}
                      </Text>
                    ) : calculatedPaceOption()?.below_recommended_minimum ? (
                      <Text style={styles.setupChoiceDetail}>Set to the recommended minimum</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.reviewList}>
                  {(
                    [
                      {
                        step: 'basics' as const,
                        label: 'About you',
                        value: [
                          profileDisplayNameDraft.trim(),
                          onboardingSexDraft === 'male' ? 'Male' : 'Female',
                          formatBodyField('age', onboardingUnitsDraft, onboardingWheelDrafts()),
                          formatBodyField('height', onboardingUnitsDraft, onboardingWheelDrafts()),
                          formatBodyField('weight', onboardingUnitsDraft, onboardingWheelDrafts())
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      },
                      {
                        step: 'activity' as const,
                        label: 'Daily activity',
                        value: activityLevelCards.find((option) => option.id === onboardingActivityLevelDraft)?.title ?? 'Sedentary'
                      },
                      {
                        step: 'goal' as const,
                        label: 'Goal',
                        value: [
                          formatGoalTypeLabel(onboardingGoalTypeDraft),
                          onboardingGoalTypeDraft ? formatGoalPaceLabel(onboardingGoalTypeDraft, onboardingGoalPaceDraft) : '',
                          onboardingGoalTypeDraft !== 'maintain'
                            ? formatBodyField('goalWeight', onboardingUnitsDraft, onboardingWheelDrafts())
                              ? `goal ${formatBodyField('goalWeight', onboardingUnitsDraft, onboardingWheelDrafts())}`
                              : ''
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      },
                      {
                        step: 'diet' as const,
                        label: 'How you eat',
                        value: dietaryPatternOptions.find((option) => option.id === onboardingDietaryPatternDraft)?.title ?? 'Not chosen'
                      },
                      {
                        step: 'style' as const,
                        label: 'Nutrition style',
                        value: nutritionStyleOptions.find((option) => option.id === onboardingNutritionStyleDraft)?.title ?? 'Not chosen'
                      },
                      {
                        step: 'balance' as const,
                        label: 'Meal balance',
                        value: MEAL_STYLES.find((option) => option.id === onboardingMealStyleDraft)?.label ?? 'Balanced'
                      },
                      {
                        step: 'allergies' as const,
                        label: 'Avoid',
                        value: formatAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft) || 'Nothing'
                      }
                    ]
                  ).map((row) => (
                    <View key={row.step} style={styles.reviewRow}>
                      <View style={styles.reviewRowCopy}>
                        <Text style={styles.reviewRowLabel}>{row.label}</Text>
                        <Text style={styles.reviewRowValue}>{row.value}</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setOnboardingError(null);
                          setOnboardingStep(row.step);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${row.label}`}
                        hitSlop={10}
                      >
                        <Text style={styles.reviewEdit}>Edit</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

              <View style={styles.setupFooter}>
                <View style={styles.setupNavRow}>
                  <Pressable
                    style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                    onPress={goToPreviousOnboardingStep}
                    disabled={onboardingSaving}
                  >
                    <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
                  </Pressable>

                  {onboardingStep === 'review' ? (
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                      onPress={() => void completeOnboardingSetup()}
                      disabled={onboardingSaving}
                    >
                      <Text style={styles.setupActionButtonLabelPrimary}>
                        {onboardingSaving ? 'Saving...' : 'Create profile'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                      onPress={goToNextOnboardingStep}
                      disabled={onboardingSaving}
                    >
                      <Text style={styles.setupActionButtonLabelPrimary}>Next</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
