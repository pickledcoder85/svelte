import { StatusBar } from 'expo-status-bar';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

import { ActivityCaption, ActivityEnergyBars, ActivitySlider } from '../../components/ActivityLevel';
import { ChoiceSheet } from '../../components/ChoiceSheet';
import { FieldGroup, PickerField } from '../../components/FormField';
import { PickerSheet } from '../../components/PickerSheet';
import { SetupLanguageSwitch } from '../../components/SetupLanguageSwitch';
import { formatNumber, useT, type Language } from '../../i18n';
import { activityLevelText, type ActivityLevel } from '../../lib/activity-level';
import { describeAllergySelection, type AllergyChoice } from '../../lib/allergies';
import { firstName, toneColor } from '../../lib/app-format';
import { bodyMeasurementsFromDrafts, type BodyDrafts, type UnitSystem } from '../../lib/body-units';
import { MEAL_STYLES, mealStyleText, type MealStyleId } from '../../lib/meal-split';
import {
  DEFAULT_PACE,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  caloriesToMoveMore,
  estimateGoalDate,
  formatApproximateDate,
  formatCalories,
  formatWeeklyRate,
  goalLabel,
  goalText,
  paceDisplay,
  paceLabel,
  paceText,
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
  /** Settings → Language's switch: changes the language now and saves it to the profile. */
  applyLanguage: (language: Language) => void;
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
  completeOnboardingSetup,
  applyLanguage
}: OnboardingWizardProps): ReactElement {
  const t = useT();
  const activeStepIndex = onboardingSteps.findIndex((step) => step.id === onboardingStep);
  const activeStep = onboardingSteps[activeStepIndex];
  const currentStepLabel = t(`setup.steps.${activeStep?.id ?? 'basics'}`);
  const showOnboardingStatus = onboardingSaving || Boolean(onboardingError);
  /** "1,200" in English, "1.200" in Spanish. */
  const num = (value: number) => formatNumber(Math.round(value), undefined, t.locale);
  const kcal = (value: number) => t('common.kcal', { value: num(value) });
  const bodyField = (field: BodyField) => formatBodyField(field, onboardingUnitsDraft, onboardingWheelDrafts(), t);
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
              <SetupLanguageSwitch onChange={applyLanguage} />
              <View
                style={styles.setupProgress}
                accessibilityRole="progressbar"
                accessibilityLabel={t('setup.progress.label', {
                  step: activeStepIndex + 1,
                  total: onboardingSteps.length,
                  name: currentStepLabel
                })}
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
                  {t('setup.progress.count', { step: activeStepIndex + 1, total: onboardingSteps.length })}
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
                    {onboardingSaving ? t('setup.status.saving') : t('setup.status.issue')}
                  </Text>
                  {onboardingError ? <Text style={styles.inlineStatusDetail}>{onboardingError}</Text> : null}
                </View>
              ) : null}

            {floorWarning ? (
              (() => {
                const pending = calculatedPaceOption(floorWarning.pace);
                const minimum = targetPreview?.recommended_minimum_calories ?? 1200;
                const calculatedCalories = Math.round(pending?.calorie_target ?? 0);
                const who = onboardingSexDraft === 'male' ? t('setup.floor.forMen') : t('setup.floor.forWomen');
                return (
                  <ChoiceSheet
                    title={t('setup.floor.title')}
                    primaryLabel={t('setup.floor.useMinimum', { value: num(minimum) })}
                    primaryDetail={t('setup.floor.recommended')}
                    secondaryLabel={t('setup.floor.keep', { value: num(calculatedCalories) })}
                    secondaryDetail={t('setup.floor.optOut')}
                    onPrimary={() => answerFloorWarning('recommended')}
                    onSecondary={() => answerFloorWarning('off')}
                    onDismiss={() => setFloorWarning(null)}
                  >
                    <View style={styles.floorCompare}>
                      <View style={styles.floorCompareTile}>
                        <Text style={styles.floorCompareLabel}>
                          {onboardingGoalTypeDraft === 'maintain' ? t('setup.floor.maintaining') : t('setup.floor.thisPace')}
                        </Text>
                        <Text style={[styles.floorCompareValue, styles.paceRowCaloriesBelow]}>{kcal(calculatedCalories)}</Text>
                      </View>
                      <View style={styles.floorCompareTile}>
                        <Text style={styles.floorCompareLabel}>{t('setup.floor.recommendedMinimum')}</Text>
                        <Text style={styles.floorCompareValue}>{kcal(minimum)}</Text>
                        <Text style={styles.floorCompareNote}>{who}</Text>
                      </View>
                    </View>
                    <Text style={styles.floorWarningText}>{t('setup.floor.risk')}</Text>
                    {pending && caloriesToMoveMore(pending, minimum) > 0 ? (
                      <View style={styles.floorTip}>
                        <Text style={styles.floorWarningText}>
                          <Text style={styles.floorWarningStrong}>{t('setup.floor.better')}</Text>{' '}
                          {t('setup.floor.betterDetail', {
                            minimum: num(minimum),
                            extra: num(caloriesToMoveMore(pending, minimum))
                          })}
                        </Text>
                      </View>
                    ) : null}
                    {calculatedCalories < VERY_LOW_CALORIE_LIMIT ? (
                      <Text style={styles.floorWarningText}>{t('setup.floor.veryLow', { limit: VERY_LOW_CALORIE_LIMIT })}</Text>
                    ) : null}
                    <Text style={styles.floorWarningHint}>{t('setup.floor.hint')}</Text>
                  </ChoiceSheet>
                );
              })()
            ) : null}

            {bodyPicker ? (
              <PickerSheet
                key={`${bodyPicker}-${onboardingUnitsDraft}`}
                title={t(`setup.body.${bodyPicker}`)}
                columns={wheelColumns(bodyPicker, onboardingUnitsDraft, t)}
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
                      clearLabel: t('setup.body.noGoalWeight'),
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
                <Text style={styles.panelTitle}>{t('setup.body.title')}</Text>
                <Text style={styles.setupIntroText}>{t('setup.body.intro')}</Text>

                <View style={styles.unitToggle} accessibilityRole="radiogroup" accessibilityLabel={t('setup.body.units')}>
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

                <FieldGroup label={t('setup.body.name')}>
                  <TextInput
                    value={profileDisplayNameDraft}
                    onChangeText={setProfileDisplayNameDraft}
                    placeholder={t('setup.body.namePlaceholder')}
                    placeholderTextColor={tc.fg_9aa6b8}
                    style={styles.settingsInput}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="name"
                    maxLength={60}
                    accessibilityLabel={t('setup.body.name')}
                  />
                </FieldGroup>

                <FieldGroup label={t('setup.body.sex')}>
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
                            {option === 'male' ? t('setup.body.male') : t('setup.body.female')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </FieldGroup>

                <PickerField
                  label={t('setup.body.height')}
                  value={bodyField('height')}
                  placeholder={t('setup.body.choose')}
                  onPress={() => setBodyPicker('height')}
                  accessibilityLabel={t('setup.body.height')}
                />

                <View style={styles.profileFieldRow}>
                  <PickerField
                    style={styles.profileFieldHalf}
                    label={t('setup.body.weight')}
                    value={bodyField('weight')}
                    placeholder={t('setup.body.choose')}
                    onPress={() => setBodyPicker('weight')}
                    accessibilityLabel={t('setup.body.weight')}
                  />
                  <PickerField
                    style={styles.profileFieldHalf}
                    label={t('setup.body.age')}
                    value={bodyField('age')}
                    placeholder={t('setup.body.choose')}
                    onPress={() => setBodyPicker('age')}
                    accessibilityLabel={t('setup.body.age')}
                  />
                </View>
              </View>
            ) : null}

            {onboardingStep === 'activity' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>{t('setup.activity.title')}</Text>
                <Text style={styles.setupIntroText}>{t('setup.activity.intro')}</Text>

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
                  accessibilityLabel={t('setup.activity.bmrLink')}
                  accessibilityState={{ expanded: showBmrExplainer }}
                  hitSlop={12}
                  style={styles.bmrLinkButton}
                >
                  <Text style={styles.bmrLink}>{showBmrExplainer ? t('setup.activity.hideBmr') : t('setup.activity.bmrLink')}</Text>
                </Pressable>
                {showBmrExplainer ? (
                  <Text style={styles.bmrExplainer}>{t('setup.activity.bmrExplainer')}</Text>
                ) : null}
              </View>
            ) : null}

            {onboardingStep === 'goal' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>{t('setup.goal.title')}</Text>
                {targetPreview ? (
                  <Text style={styles.setupIntroText}>
                    {t('setup.goal.youBurn', { calories: formatCalories(targetPreview.maintenance_calories, t) })}
                  </Text>
                ) : null}

                <View style={styles.setupGoalGrid}>
                  {GOAL_OPTIONS.map((option) => {
                    const active = onboardingGoalTypeDraft === option.id;
                    const preview = displayedPace(option.id, DEFAULT_PACE[option.id]);
                    const text = goalText(option.id, t);
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
                        <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>{text.title}</Text>
                        <Text style={styles.setupChoiceDetail}>{text.detail}</Text>
                        {preview ? (
                          <Text
                            style={[
                              styles.setupGoalCalories,
                              (preview.state === 'below' || preview.state === 'opted_out') && styles.paceRowCaloriesBelow
                            ]}
                          >
                            {t('setup.goal.about', { calories: formatCalories(preview.calories, t) })}
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
                  {onboardingGoalTypeDraft === 'maintain' ? t('setup.pace.titleFocus') : t('setup.pace.titleHowFast')}
                </Text>
                <Text style={styles.setupIntroText}>
                  {onboardingGoalTypeDraft === 'maintain' ? t('setup.pace.introFocus') : t('setup.pace.introPace')}
                </Text>

                <View style={styles.setupOptionStack}>
                  {(onboardingGoalTypeDraft ? PACE_OPTIONS[onboardingGoalTypeDraft] : []).map((option) => {
                    const active = onboardingGoalPaceDraft === option.id;
                    const text = onboardingGoalTypeDraft ? paceText(onboardingGoalTypeDraft, option.id, t) : { title: option.title };
                    const calculated = calculatedPaceOption(option.id);
                    const minimum = targetPreview?.recommended_minimum_calories ?? 1200;
                    // The honest number until the user decides; red when below the minimum.
                    const display = calculated
                      ? paceDisplay(calculated, onboardingCalorieFloorDraft, floorAnswered(option.id))
                      : null;
                    const rate =
                      display && onboardingGoalTypeDraft !== 'maintain'
                        ? formatWeeklyRate(display.weeklyChangeLbs, onboardingUnitsDraft, t)
                        : '';
                    // The recommended minimum can turn a loss pace into a small surplus.
                    const wrongDirection =
                      display !== null &&
                      ((onboardingGoalTypeDraft === 'lose' && display.weeklyChangeLbs >= 0) ||
                        (onboardingGoalTypeDraft === 'gain' && display.weeklyChangeLbs <= 0));
                    const belowShown = display?.state === 'below' || display?.state === 'opted_out';
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
                            {text.title}
                          </Text>
                          {display ? (
                            <Text style={[styles.paceRowCalories, belowShown && styles.paceRowCaloriesBelow]}>
                              {formatCalories(display.calories, t)}
                            </Text>
                          ) : null}
                        </View>
                        {rate && !wrongDirection ? (
                          <Text style={styles.setupChoiceDetail}>
                            {display && display.weeklyChangeLbs < 0 ? t('setup.pace.lose', { rate }) : t('setup.pace.gain', { rate })}
                          </Text>
                        ) : null}
                        {text.note ? <Text style={styles.setupGoalNote}>{text.note}</Text> : null}
                        {display?.state === 'below' ? (
                          <Text style={styles.paceRowWarning}>{t('setup.pace.below', { minimum: kcal(minimum) })}</Text>
                        ) : display?.state === 'opted_out' ? (
                          <Text style={styles.paceRowWarning}>{t('setup.pace.belowFloorOff', { minimum: kcal(minimum) })}</Text>
                        ) : display?.state === 'using_minimum' ? (
                          <Text style={styles.setupChoiceDetail}>
                            {t('setup.pace.usingMinimum', { calculated: kcal(display.calculatedCalories) })}
                          </Text>
                        ) : null}
                        {wrongDirection ? (
                          <Text style={styles.paceRowWarning}>{t('setup.pace.wrongDirection', { minimum: kcal(minimum) })}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {onboardingGoalTypeDraft !== 'maintain' ? (
                  <View style={styles.goalWeightBlock}>
                    <PickerField
                      label={t('setup.pace.goalWeightOptional')}
                      value={bodyField('goalWeight')}
                      placeholder={t('setup.body.choose')}
                      onPress={() => setBodyPicker('goalWeight')}
                      accessibilityLabel={t('setup.body.goalWeight')}
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
                          {t('setup.pace.estimate', {
                            count: estimate.weeks,
                            date: formatApproximateDate(estimate.date, t)
                          })}
                        </Text>
                      ) : (
                        <Text style={styles.paceRowWarning}>
                          {onboardingGoalTypeDraft === 'lose' ? t('setup.pace.goalBelowCurrent') : t('setup.pace.goalAboveCurrent')}
                        </Text>
                      );
                    })()}
                  </View>
                ) : null}
              </View>
            ) : null}

            {onboardingStep === 'diet' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>{t('setup.diet.title')}</Text>
                <Text style={styles.setupIntroText}>{t('setup.diet.intro')}</Text>
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
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {t(`setup.diet.options.${option.id}.title`)}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>{t(`setup.diet.options.${option.id}.subtitle`)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'style' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>{t('setup.style.title')}</Text>
                <Text style={styles.setupIntroText}>{t('setup.style.intro')}</Text>
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
                          <Text style={[styles.setupChoiceTitle, active && styles.setupChoiceTitleActive]}>
                            {t(`setup.style.options.${option.id}.title`)}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>{t(`setup.style.options.${option.id}.subtitle`)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'balance' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>{t('setup.balance.title')}</Text>
                <Text style={styles.setupIntroText}>{t('setup.balance.intro')}</Text>
                <View style={styles.setupOptionStack} accessibilityRole="radiogroup">
                  {MEAL_STYLES.map((option) => {
                    const active = onboardingMealStyleDraft === option.id;
                    const [breakfast, lunch, dinner] = option.splits[3];
                    const text = mealStyleText(option.id, t);
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
                            {text.label}
                            {option.id === 'balanced' ? t('setup.balance.defaultSuffix') : ''}
                          </Text>
                          <Text style={styles.setupChoiceDetail}>{text.detail}</Text>
                          <Text style={styles.setupChoiceDetail}>{t('setup.balance.split', { breakfast, lunch, dinner })}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {onboardingStep === 'allergies' ? (
              <View style={styles.setupPanel}>
                <Text style={styles.panelTitle}>{t('setup.allergies.title')}</Text>
                <Text style={styles.setupIntroText}>{t('setup.allergies.intro')}</Text>
                {/* Two columns of compact tiles, so all eight fit on a phone screen. */}
                <View style={styles.allergyGrid}>
                  {allergyOptions.map((option) => {
                    const active = onboardingAllergySelectionsDraft.includes(option.id);
                    const title = t(`setup.allergies.options.${option.id}.title`);
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.allergyTile, active && styles.setupOptionRowActive]}
                        onPress={() => toggleOnboardingAllergy(option.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                        accessibilityLabel={title}
                      >
                        <Text style={styles.allergyIcon} accessibilityElementsHidden importantForAccessibility="no">
                          {option.icon}
                        </Text>
                        <Text
                          style={[styles.allergyLabel, active && styles.setupChoiceTitleActive]}
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                        <View style={[styles.setupCheckBox, styles.allergyCheck, active && styles.setupCheckBoxActive]}>
                          {active ? <Text style={styles.setupCheckMark}>✓</Text> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {onboardingAllergySelectionsDraft.includes('other') ? (
                  <FieldGroup label={t('setup.allergies.other')}>
                    <TextInput
                      value={onboardingAllergyOtherDraft}
                      onChangeText={setOnboardingAllergyOtherDraft}
                      placeholder={t('setup.allergies.otherPlaceholder')}
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
                  {firstName(profileDisplayNameDraft)
                    ? t('setup.review.titleNamed', { name: firstName(profileDisplayNameDraft) })
                    : t('setup.review.title')}
                </Text>
                <Text style={styles.setupIntroText}>{t('setup.review.intro')}</Text>

                {effectivePaceOption() ? (
                  <View style={styles.reviewTarget}>
                    <Text style={styles.reviewTargetLabel}>{t('setup.review.dailyTarget')}</Text>
                    <Text style={styles.reviewTargetValue}>{formatCalories(effectivePaceOption()?.calorie_target ?? 0, t)}</Text>
                    <Text style={styles.reviewTargetMacros}>
                      {t('setup.review.macros', {
                        protein: num(effectivePaceOption()?.protein_target_g ?? 0),
                        carbs: num(effectivePaceOption()?.carbs_target_g ?? 0),
                        fat: num(effectivePaceOption()?.fat_target_g ?? 0)
                      })}
                    </Text>
                    {onboardingCalorieFloorDraft === 'off' ? (
                      <Text style={styles.paceRowWarning}>
                        {calculatedPaceOption()?.below_recommended_minimum
                          ? t('setup.review.floorOffBelow')
                          : t('setup.review.floorOffFuture')}
                      </Text>
                    ) : calculatedPaceOption()?.below_recommended_minimum ? (
                      <Text style={styles.setupChoiceDetail}>{t('setup.review.setToMinimum')}</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.reviewList}>
                  {(
                    [
                      {
                        step: 'basics' as const,
                        label: t('setup.review.rows.basics'),
                        value: [
                          profileDisplayNameDraft.trim(),
                          onboardingSexDraft === 'male' ? t('setup.body.male') : t('setup.body.female'),
                          bodyField('age'),
                          bodyField('height'),
                          bodyField('weight')
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      },
                      {
                        step: 'activity' as const,
                        label: t('setup.review.rows.activity'),
                        value: activityLevelText(onboardingActivityLevelDraft, t).title
                      },
                      {
                        step: 'goal' as const,
                        label: t('setup.review.rows.goal'),
                        value: [
                          goalLabel(onboardingGoalTypeDraft, t),
                          onboardingGoalTypeDraft ? paceLabel(onboardingGoalTypeDraft, onboardingGoalPaceDraft, t) : '',
                          onboardingGoalTypeDraft !== 'maintain' && bodyField('goalWeight')
                            ? t('setup.review.goalWeight', { weight: bodyField('goalWeight') })
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      },
                      {
                        step: 'diet' as const,
                        label: t('setup.review.rows.diet'),
                        value: onboardingDietaryPatternDraft
                          ? t(`setup.diet.options.${onboardingDietaryPatternDraft}.title`)
                          : t('setup.review.notChosen')
                      },
                      {
                        step: 'style' as const,
                        label: t('setup.review.rows.style'),
                        value: onboardingNutritionStyleDraft
                          ? t(`setup.style.options.${onboardingNutritionStyleDraft}.title`)
                          : t('setup.review.notChosen')
                      },
                      {
                        step: 'balance' as const,
                        label: t('setup.review.rows.balance'),
                        value: mealStyleText(
                          MEAL_STYLES.some((option) => option.id === onboardingMealStyleDraft) ? onboardingMealStyleDraft : 'balanced',
                          t
                        ).label
                      },
                      {
                        step: 'allergies' as const,
                        label: t('setup.review.rows.allergies'),
                        value:
                          describeAllergySelection(onboardingAllergySelectionsDraft, onboardingAllergyOtherDraft, t) ||
                          t('setup.review.nothing')
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
                        accessibilityLabel={t('setup.review.editRow', { label: row.label })}
                        hitSlop={10}
                      >
                        <Text style={styles.reviewEdit}>{t('setup.review.edit')}</Text>
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
                    <Text style={styles.setupActionButtonLabelSecondary}>{t('setup.nav.back')}</Text>
                  </Pressable>

                  {onboardingStep === 'review' ? (
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                      onPress={() => void completeOnboardingSetup()}
                      disabled={onboardingSaving}
                    >
                      <Text style={styles.setupActionButtonLabelPrimary}>
                        {onboardingSaving ? t('setup.nav.saving') : t('setup.nav.create')}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                      onPress={goToNextOnboardingStep}
                      disabled={onboardingSaving}
                    >
                      <Text style={styles.setupActionButtonLabelPrimary}>{t('setup.nav.next')}</Text>
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
