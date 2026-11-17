import { StatusBar } from 'expo-status-bar';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { ONBOARDING_WELCOME } from '../../lib/onboarding-welcome';
import { mascotDefaultImage, type OnboardingStep } from '../shared/constants';
import { styles } from '../shared/styles';

export interface OnboardingWelcomeProps {
  ribeyeLoaded: boolean;
  setOnboardingError: Dispatch<SetStateAction<string | null>>;
  setOnboardingStep: Dispatch<SetStateAction<OnboardingStep>>;
}

export function OnboardingWelcome({
  ribeyeLoaded,
  setOnboardingError,
  setOnboardingStep
}: OnboardingWelcomeProps): ReactElement {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.setupBackdrop}>
          <View style={[styles.setupCard, styles.onboardingWelcomeCard]}>
            <Image source={mascotDefaultImage} style={styles.onboardingWelcomeImage} resizeMode="contain" />
            <Text style={[styles.onboardingWelcomeTitle, ribeyeLoaded && styles.onboardingWelcomeTitleDisplay]}>
              {ONBOARDING_WELCOME.title}
            </Text>
            <Text style={styles.onboardingWelcomeIntro}>{ONBOARDING_WELCOME.intro}</Text>
            <View style={styles.onboardingWelcomeList}>
              {ONBOARDING_WELCOME.sections.map((section) => (
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
            <Text style={styles.onboardingWelcomeFootnote}>{ONBOARDING_WELCOME.footnote}</Text>
            <Pressable
              style={[styles.setupActionButton, styles.setupActionButtonPrimary, styles.onboardingWelcomeAction]}
              onPress={() => {
                setOnboardingError(null);
                setOnboardingStep('basics');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.setupActionButtonLabelPrimary}>{ONBOARDING_WELCOME.action} →</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
