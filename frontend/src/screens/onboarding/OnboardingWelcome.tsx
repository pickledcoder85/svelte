import { StatusBar } from 'expo-status-bar';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { SetupLanguageSwitch } from '../../components/SetupLanguageSwitch';
import { useT, type Language } from '../../i18n';
import { onboardingWelcome } from '../../lib/onboarding-welcome';
import { mascotDefaultImage, type OnboardingStep } from '../shared/constants';
import { styles } from '../shared/styles';

export interface OnboardingWelcomeProps {
  ribeyeLoaded: boolean;
  setOnboardingError: Dispatch<SetStateAction<string | null>>;
  setOnboardingStep: Dispatch<SetStateAction<OnboardingStep>>;
  /** Settings → Language's switch: changes the language now and saves it to the profile. */
  applyLanguage: (language: Language) => void;
}

export function OnboardingWelcome({
  ribeyeLoaded,
  setOnboardingError,
  setOnboardingStep,
  applyLanguage
}: OnboardingWelcomeProps): ReactElement {
  const t = useT();
  const welcome = onboardingWelcome(t);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.setupBackdrop}>
          <View style={[styles.setupCard, styles.onboardingWelcomeCard]}>
            <SetupLanguageSwitch onChange={applyLanguage} />
            <Image source={mascotDefaultImage} style={styles.onboardingWelcomeImage} resizeMode="contain" />
            <Text style={[styles.onboardingWelcomeTitle, ribeyeLoaded && styles.onboardingWelcomeTitleDisplay]}>
              {welcome.title}
            </Text>
            <Text style={styles.onboardingWelcomeIntro}>{welcome.intro}</Text>
            <View style={styles.onboardingWelcomeList}>
              {welcome.sections.map((section) => (
                <View key={section.number} style={styles.onboardingWelcomeRow}>
                  <View style={styles.onboardingWelcomeBadge}>
                    <Text style={styles.onboardingWelcomeBadgeLabel}>{section.number}</Text>
                  </View>
                  <View style={styles.onboardingWelcomeRowCopy}>
                    <Text style={styles.onboardingWelcomeRowTitle}>{section.title}</Text>
                    <Text style={styles.onboardingWelcomeRowDetail}>{section.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.onboardingWelcomeFootnote}>{welcome.footnote}</Text>
            <Pressable
              style={[styles.setupActionButton, styles.setupActionButtonPrimary, styles.onboardingWelcomeAction]}
              onPress={() => {
                setOnboardingError(null);
                setOnboardingStep('basics');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.setupActionButtonLabelPrimary}>{welcome.action} →</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
