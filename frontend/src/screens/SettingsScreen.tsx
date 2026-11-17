import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import appConfig from '../../app.json';
import { ChoiceSheet } from '../components/ChoiceSheet';
import { FieldGroup } from '../components/FormField';
import { RemindersSettings } from '../components/RemindersSettings';
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
  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Settings</Text>
        <Text style={styles.panelTitle}>Account</Text>
        {settingsMessage ? <Text style={styles.settingsMessage}>{settingsMessage}</Text> : null}
        {settingsError ? <Text style={styles.settingsError}>{settingsError}</Text> : null}
        <FieldGroup label="Name">
          <TextInput
            value={profileDisplayNameDraft}
            onChangeText={setProfileDisplayNameDraft}
            placeholder="Your name"
            placeholderTextColor={tc.fg_9aa6b8}
            style={styles.settingsInput}
            autoCorrect={false}
          />
        </FieldGroup>
        <FieldGroup label="Signed in as">
          <View style={styles.settingsReadOnly}>
            <Text style={styles.settingsValue}>{profile?.email ?? '—'}</Text>
            <Text style={styles.settingsHint}>
              {isOwnerSession ? 'Through Tailscale on this device. No password needed.' : 'Local session'}
            </Text>
          </View>
        </FieldGroup>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Settings</Text>
        <Text style={styles.panelTitle}>Preferences</Text>
        <FieldGroup label="Appearance">
          <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
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
                  <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.settingsHint}>
            {appearance.preference === 'system'
              ? `Follows your iPhone (${appearance.scheme === 'dark' ? 'dark' : 'light'} right now). Saved on this device.`
              : 'Saved on this device. Applies right away.'}
          </Text>
        </FieldGroup>
        <FieldGroup label="Units">
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
        <FieldGroup label="Time zone">
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
              <Text style={styles.settingsLink}>Use this iPhone's time zone ({deviceTimeZone()})</Text>
            </Pressable>
          ) : null}
        </FieldGroup>
        <Pressable
          style={[styles.primaryButton, (settingsSaving || !profile) && styles.buttonDisabled]}
          onPress={() => void saveSettings()}
          disabled={settingsSaving || !profile}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonLabel}>{settingsSaving ? 'Saving…' : 'Save settings'}</Text>
        </Pressable>
      </View>

      {profile?.setup_complete ? (
        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>Settings</Text>
          <Text style={styles.panelTitle}>Nutrition</Text>
          {floorMessage ? <Text style={styles.settingsMessage}>{floorMessage}</Text> : null}
          <FieldGroup label="Calorie floor">
            <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Calorie floor">
              {(
                [
                  { id: 'recommended' as const, label: 'Recommended' },
                  { id: 'off' as const, label: 'Off' }
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
                ? 'Off: your daily target is used as calculated, even below the recommended minimum.'
                : `Your daily target never goes below ${profile.sex === 'male' ? '1,500' : '1,200'} kcal, the minimum dietitians recommend for ${profile.sex === 'male' ? 'men' : 'women'}.`}
            </Text>
          </FieldGroup>
          <FieldGroup label="Water goal">
            <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Water goal">
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
                    accessibilityLabel={`${count} glasses`}
                  >
                    <Text style={[styles.setupSegmentLabel, active && styles.setupChoiceTitleActive]}>{count}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.settingsHint}>
              {`Glasses of ${volumeLabel(GLASS_ML, profile.units === 'metric')} a day: ${volumeLabel(profile.water_goal_ml ?? DEFAULT_WATER_GOAL_ML, profile.units === 'metric')}. 8 glasses (${volumeLabel(8 * GLASS_ML, profile.units === 'metric')}) is a common goal; food and other drinks count toward what you need too.`}
            </Text>
          </FieldGroup>
          <FieldGroup label="Water reminders">
            {foodSessionToken ? <RemindersSettings accessToken={foodSessionToken} /> : null}
          </FieldGroup>
          <FieldGroup label="Workout calories">
            <View style={styles.setupSegmentRow} accessibilityRole="radiogroup" accessibilityLabel="Workout calories">
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
                      {share === 0 ? 'Off' : `${share}%`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.settingsHint}>
              {(profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE) === 0
                ? "Off: workouts you log don't change your daily allowance."
                : `${profile.workout_calories_share ?? DEFAULT_WORKOUT_CALORIES_SHARE}% of the calories from each workout you log is added to that day's allowance, so you can eat a bit more and stay on pace. 75% is recommended: watch and app estimates tend to run high, and research suggests a workout raises your day's burn by less than the workout itself.`}
            </Text>
          </FieldGroup>
          <FieldGroup label="Garmin">
            <Text style={styles.settingsHint}>{garminStatusText(garminStatus, new Date())}</Text>
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
                <Text style={styles.secondaryButtonLabel}>{garminSyncing ? 'Syncing…' : 'Sync now'}</Text>
              </Pressable>
            ) : null}
            {garminNote ? <Text style={styles.settingsHint}>{garminNote}</Text> : null}
            <Text style={styles.settingsHint}>
              Workouts sync every 30 minutes and when you open Relish. Garmin's numbers are kept as recorded. Relish counts the active part: the
              watch's total minus your own resting calories for those minutes, so resting calories aren't counted twice.
            </Text>
          </FieldGroup>
        </View>
      ) : null}

      {settingsFloorWarning ? (
        <ChoiceSheet
          title="Turn off the calorie floor?"
          primaryLabel="Keep the minimum"
          primaryDetail="Recommended"
          secondaryLabel="Turn it off"
          onPrimary={() => setSettingsFloorWarning(false)}
          onSecondary={() => {
            setSettingsFloorWarning(false);
            void applyCalorieFloor('off');
          }}
          onDismiss={() => setSettingsFloorWarning(false)}
        >
          <Text style={styles.floorWarningText}>
            Dietitians generally recommend at least {profile?.sex === 'male' ? '1,500 kcal a day for men' : '1,200 kcal a day for women'}{' '}
            unless a doctor is supervising. With the floor off, your target can go below that.
          </Text>
          <Text style={styles.floorWarningText}>
            Eating less makes it hard to get enough protein, vitamins, and minerals, speeds up muscle loss, and often brings
            fatigue and rebound weight gain. Proceed with care.
          </Text>
        </ChoiceSheet>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>Start over</Text>
        <Text style={styles.panelTitle}>Reset profile</Text>
        <Text style={styles.panelDetail}>
          Runs setup again from the welcome screen, and clears your goals and meal pattern (the meal-planning guide runs
          again). Your foods, logged meals and workouts, weigh-ins, and plans are kept. To change your weight or goal, edit
          the profile above instead.
        </Text>
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
              ? 'Resetting…'
              : confirmDeleteKey === 'profile-reset'
                ? 'Tap again to reset and start setup'
                : 'Reset profile'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelEyebrow}>About</Text>
        <Text style={styles.panelTitle}>Relish {appConfig.expo.version}</Text>
        <Text style={styles.panelDetail}>
          Packaged food data from Open Food Facts (openfoodfacts.org), available under the Open Database License (ODbL).
          Food data from USDA FoodData Central.
        </Text>
      </View>
    </>
  );
}
