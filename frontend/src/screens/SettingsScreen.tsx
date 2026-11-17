import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import appConfig from '../../app.json';
import { ChoiceSheet } from '../components/ChoiceSheet';
import { FieldGroup } from '../components/FormField';
import { RemindersSettings } from '../components/RemindersSettings';
import { formatNumber, useT, type Language } from '../i18n';
import { deviceTimeZone } from '../lib/body-units';
import { DEFAULT_WORKOUT_CALORIES_SHARE, WORKOUT_CALORIE_SHARES, type WorkoutCaloriesShare } from '../lib/daily-home';
import { garminStatusText } from '../lib/garmin';
import type { CalorieFloorChoice } from '../lib/setup-goals';
import { DEFAULT_WATER_GOAL_ML, GLASS_ML, volumeLabel, WATER_GOAL_GLASSES } from '../lib/water';
import { APPEARANCE_OPTIONS, setAppearance, useAppearance } from '../theme/appearance';
import { tc } from '../theme/palette';
import type { GarminStatus, UserProfile } from '../types';
import { styles } from './shared/styles';

export interface SettingsScreenProps {
  settingsMessage: string | null;
  settingsError: string | null;
  profileDisplayNameDraft: string;
  setProfileDisplayNameDraft: Dispatch<SetStateAction<string>>;
  profile: UserProfile | null;
  isOwnerSession: boolean;
  appearance: ReturnType<typeof useAppearance>;
  language: Language;
  applyLanguage: (language: Language) => Promise<void>;
  profileUnitsDraft: 'imperial' | 'metric';
  setProfileUnitsDraft: Dispatch<SetStateAction<'imperial' | 'metric'>>;
  profileTimezoneDraft: string;
  setProfileTimezoneDraft: Dispatch<SetStateAction<string>>;
  settingsSaving: boolean;
  saveSettings: () => Promise<void>;
  floorMessage: string | null;
  setSettingsFloorWarning: Dispatch<SetStateAction<boolean>>;
  applyCalorieFloor: (choice: CalorieFloorChoice) => Promise<void>;
  applyWaterGoal: (goalMl: number) => Promise<void>;
  foodSessionToken: string | null;
  applyWorkoutCaloriesShare: (share: WorkoutCaloriesShare) => Promise<void>;
  garminStatus: GarminStatus | null;
  garminSyncing: boolean;
  runGarminSync: (token: string, announce?: boolean) => Promise<void>;
  garminNote: string | null;
  settingsFloorWarning: boolean;
  confirmDeleteKey: string | null;
  resetProfile: () => Promise<void>;
  profileResetting: boolean;
}

export function SettingsScreen({
  settingsMessage,
  settingsError,
  profileDisplayNameDraft,
  setProfileDisplayNameDraft,
  profile,
  isOwnerSession,
  appearance,
  language,
  applyLanguage,
  profileUnitsDraft,
  setProfileUnitsDraft,
  profileTimezoneDraft,
  setProfileTimezoneDraft,
  settingsSaving,
  saveSettings,
  floorMessage,
  setSettingsFloorWarning,
  applyCalorieFloor,
  applyWaterGoal,
  foodSessionToken,
  applyWorkoutCaloriesShare,
  garminStatus,
  garminSyncing,
  runGarminSync,
  garminNote,
  settingsFloorWarning,
  confirmDeleteKey,
  resetProfile,
  profileResetting
}: SettingsScreenProps): ReactElement {
  const t = useT();
  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>{t('settings.eyebrow')}</Text>
        <Text style={styles.panelTitle}>{t('settings.account')}</Text>
        {settingsMessage ? <Text style={styles.settingsMessage}>{settingsMessage}</Text> : null}
        {settingsError ? <Text style={styles.settingsError}>{settingsError}</Text> : null}
        <FieldGroup label={t('settings.name')}>
          <TextInput
            value={profileDisplayNameDraft}
            onChangeText={setProfileDisplayNameDraft}
            placeholder={t('settings.namePlaceholder')}
            placeholderTextColor={tc.fg_9aa6b8}
            style={styles.settingsInput}
            autoCorrect={false}
          />
        </FieldGroup>
        <FieldGroup label={t('settings.signedInAs')}>
          <View style={styles.settingsReadOnly}>
            <Text style={styles.settingsValue}>{profile?.email ?? '—'}</Text>
            <Text style={styles.settingsHint}>
              {isOwnerSession ? t('settings.ownerSession') : t('settings.localSession')}
            </Text>
          </View>
        </FieldGroup>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>{t('settings.eyebrow')}</Text>
        <Text style={styles.panelTitle}>{t('settings.preferences')}</Text>
        <FieldGroup label={t('settings.appearance')}>
          <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel={t('settings.appearance')}>
            {APPEARANCE_OPTIONS.map((option) => {
              const active = appearance.preference === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                  onPress={() => setAppearance(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>
                    {t(`settings.appearanceOptions.${option.id}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.settingsHint}>
            {appearance.preference === 'system'
              ? t(appearance.scheme === 'dark' ? 'settings.followsPhoneDark' : 'settings.followsPhoneLight')
              : t('settings.savedOnDevice')}
          </Text>
        </FieldGroup>
        <FieldGroup label={t('settings.language.label')}>
          <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel={t('settings.language.label')}>
            {(
              [
                { id: 'en' as const, label: t('settings.language.english') },
                { id: 'es' as const, label: t('settings.language.spanish') }
              ]
            ).map((option) => {
              const active = language === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                  onPress={() => {
                    if (!active && !settingsSaving) {
                      void applyLanguage(option.id);
                    }
                  }}
                  disabled={!profile}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active, disabled: !profile }}
                >
                  <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.settingsHint}>{t('settings.language.hint')}</Text>
        </FieldGroup>
        <FieldGroup label={t('settings.units')}>
          <View style={styles.setupSegmentRow} accessibilityRole="radiogroup">
            {(
              [
                { id: 'imperial' as const, label: 'lb · ft/in' },
                { id: 'metric' as const, label: 'kg · cm' }
              ]
            ).map((option) => {
              const active = profileUnitsDraft === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                  onPress={() => setProfileUnitsDraft(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </FieldGroup>
        <FieldGroup label={t('settings.timeZone')}>
          <TextInput
            value={profileTimezoneDraft}
            onChangeText={setProfileTimezoneDraft}
            placeholder="America/New_York"
            placeholderTextColor={tc.fg_9aa6b8}
            style={styles.settingsInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {deviceTimeZone() && deviceTimeZone() !== profileTimezoneDraft ? (
            <Pressable onPress={() => setProfileTimezoneDraft(deviceTimeZone() as string)} accessibilityRole="button">
              <Text style={styles.settingsLink}>{t('settings.usePhoneTimeZone', { zone: deviceTimeZone() ?? '' })}</Text>
            </Pressable>
          ) : null}
        </FieldGroup>
        <Pressable
          style={[styles.primaryButton, (settingsSaving || !profile) && styles.buttonDisabled]}
          onPress={() => void saveSettings()}
          disabled={settingsSaving || !profile}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonLabel}>{settingsSaving ? t('common.saving') : t('settings.save')}</Text>
        </Pressable>
      </View>

      {profile?.setup_complete ? (
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>{t('settings.eyebrow')}</Text>
          <Text style={styles.panelTitle}>{t('settings.nutrition')}</Text>
          {floorMessage ? <Text style={styles.settingsMessage}>{floorMessage}</Text> : null}
          <FieldGroup label={t('settings.calorieFloor')}>
            <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel={t('settings.calorieFloor')}>
              {(
                [
                  { id: 'recommended' as const, label: t('settings.floorRecommended') },
                  { id: 'off' as const, label: t('settings.off') }
                ]
              ).map((option) => {
                const active = (profile.calorie_floor ?? 'recommended') === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                    onPress={() => {
                      if (active || settingsSaving) {
                        return;
                      }
                      if (option.id === 'off') {
                        setSettingsFloorWarning(true);
                      } else {
                        void applyCalorieFloor('recommended');
                      }
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.settingsHint}>
              {(profile.calorie_floor ?? 'recommended') === 'off'
                ? t('settings.floorOffHint')
                : t(profile.sex === 'male' ? 'settings.floorOnHintMen' : 'settings.floorOnHintWomen', {
                    value: formatNumber(profile.sex === 'male' ? 1500 : 1200, undefined, t.locale)
                  })}
            </Text>
          </FieldGroup>
          <FieldGroup label={t('settings.waterGoal')}>
            <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel={t('settings.waterGoal')}>
              {WATER_GOAL_GLASSES.map((count) => {
                const active = (profile.water_goal_ml ?? DEFAULT_WATER_GOAL_ML) === count * GLASS_ML;
                return (
                  <Pressable
                    key={count}
                    style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                    onPress={() => {
                      if (!active && !settingsSaving) {
                        void applyWaterGoal(count * GLASS_ML);
                      }
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={t('settings.glassesA11y', { count })}
                  >
                    <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.settingsHint}>
              {t('settings.waterHint', {
                glass: volumeLabel(GLASS_ML, profile.units === 'metric', t),
                total: volumeLabel(profile.water_goal_ml ?? DEFAULT_WATER_GOAL_ML, profile.units === 'metric', t),
                eight: volumeLabel(8 * GLASS_ML, profile.units === 'metric', t)
              })}
            </Text>
          </FieldGroup>
          <FieldGroup label={t('settings.waterReminders')}>
            {foodSessionToken ? <RemindersSettings accessToken={foodSessionToken} /> : null}
          </FieldGroup>
          <FieldGroup label={t('settings.workoutCalories')}>
            <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel={t('settings.workoutCalories')}>
              {WORKOUT_CALORIE_SHARES.map((share) => {
                const active = (profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE) === share;
                return (
                  <Pressable
                    key={share}
                    style={[styles.setupSegmentChoice, active && styles.setupChoiceCardActive]}
                    onPress={() => {
                      if (!active && !settingsSaving) {
                        void applyWorkoutCaloriesShare(share);
                      }
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>
                      {share === 0 ? t('settings.off') : `${share}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.settingsHint}>
              {(profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE) === 0
                ? t('settings.shareOffHint')
                : t('settings.shareHint', { percent: profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE })}
            </Text>
          </FieldGroup>
          <FieldGroup label={t('settings.garmin')}>
            <Text style={styles.settingsHint}>{garminStatusText(garminStatus, new Date(), t)}</Text>
            {garminStatus?.configured ? (
              <Pressable
                style={[styles.secondaryButton, garminSyncing && styles.buttonDisabled]}
                onPress={() => {
                  if (foodSessionToken) {
                    void runGarminSync(foodSessionToken, true);
                  }
                }}
                disabled={garminSyncing}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonLabel}>{garminSyncing ? t('settings.syncing') : t('settings.syncNow')}</Text>
              </Pressable>
            ) : null}
            {garminNote ? <Text style={styles.settingsHint}>{garminNote}</Text> : null}
            <Text style={styles.settingsHint}>{t('settings.garminHint')}</Text>
          </FieldGroup>
        </View>
      ) : null}

      {settingsFloorWarning ? (
        <ChoiceSheet
          title={t('settings.floorSheet.title')}
          primaryLabel={t('settings.floorSheet.keep')}
          primaryDetail={t('settings.floorSheet.keepDetail')}
          secondaryLabel={t('settings.floorSheet.turnOff')}
          onPrimary={() => setSettingsFloorWarning(false)}
          onSecondary={() => {
            setSettingsFloorWarning(false);
            void applyCalorieFloor('off');
          }}
          onDismiss={() => setSettingsFloorWarning(false)}
        >
          <Text style={styles.floorWarningText}>
            {t('settings.floorSheet.minimum', {
              minimum: t(profile?.sex === 'male' ? 'settings.floorSheet.forMen' : 'settings.floorSheet.forWomen', {
                value: formatNumber(profile?.sex === 'male' ? 1500 : 1200, undefined, t.locale)
              })
            })}
          </Text>
          <Text style={styles.floorWarningText}>{t('settings.floorSheet.risk')}</Text>
        </ChoiceSheet>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>{t('settings.startOver')}</Text>
        <Text style={styles.panelTitle}>{t('settings.resetTitle')}</Text>
        <Text style={styles.panelDetail}>{t('settings.resetDetail')}</Text>
        <Pressable
          style={[styles.secondaryButton, confirmDeleteKey === 'profile-reset' && styles.resetConfirmButton]}
          onPress={() => void resetProfile()}
          disabled={profileResetting}
          accessibilityRole="button"
        >
          <Text
            style={[styles.secondaryButtonLabel, confirmDeleteKey === 'profile-reset' && styles.entryDeleteConfirmLabel]}
          >
            {profileResetting
              ? t('settings.resetting')
              : confirmDeleteKey === 'profile-reset'
                ? t('settings.resetConfirm')
                : t('settings.reset')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>{t('settings.about')}</Text>
        <Text style={styles.panelTitle}>Relish {appConfig.expo.version}</Text>
        <Text style={styles.panelDetail}>{t('settings.aboutDetail')}</Text>
      </View>
    </>
  );
}
