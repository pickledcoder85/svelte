import { StatusBar } from 'expo-status-bar';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { ONBOARDING_EXPLAINERS, type ExplainerStep } from '../../lib/onboarding-explainers';
import { mascotBikeImage, mascotDefaultImage } from '../shared/constants';
import { styles } from '../shared/styles';

export interface OnboardingExplainerProps {
  activeExplainer: ExplainerStep;
  ribeyeLoaded: boolean;
  leaveExplainerBack: () => void;
  setExplainersSeen: Dispatch<SetStateAction<ExplainerStep[]>>;
  setActiveExplainer: Dispatch<SetStateAction<ExplainerStep | null>>;
}

export function OnboardingExplainer({
  activeExplainer,
  ribeyeLoaded,
  leaveExplainerBack,
  setExplainersSeen,
  setActiveExplainer
}: OnboardingExplainerProps): ReactElement {
  const explainer = ONBOARDING_EXPLAINERS[activeExplainer];
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.setupBackdrop}>
          <View style={[styles.setupCard, styles.onboardingWelcomeCard]}>
            <Image
              source={activeExplainer === 'activity' ? mascotBikeImage : mascotDefaultImage}
              style={styles.onboardingWelcomeImage}
              resizeMode="contain"
            />
            <Text
              style={[styles.onboardingWelcomeTitle, ribeyeLoaded && styles.onboardingWelcomeTitleDisplay]}
              accessibilityRole="header"
            >
              {explainer.title}
            </Text>
            <Text style={styles.onboardingWelcomeIntro}>{explainer.intro}</Text>
            <View style={styles.onboardingWelcomeList}>
              {explainer.points.map((point) => (
                <View key={point} style={styles.onboardingWelcomeRow}>
                  <View style={styles.onboardingWelcomeBadge}>
                    <Text style={styles.onboardingWelcomeBadgeLabel}>✓</Text>
                  </View>
                  <View style={styles.onboardingWelcomeRowCopy}>
                    <Text style={styles.onboardingWelcomeRowDetail}>{point}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={[styles.setupNavRow, styles.explainerActions]}>
              <Pressable
                style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                onPress={leaveExplainerBack}
                accessibilityRole="button"
              >
                <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
              </Pressable>
              <Pressable
                style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                onPress={() => {
                  // Counts as seen only once acknowledged; Back shows it again next time.
                  const seen = activeExplainer;
                  setExplainersSeen((current) => (current.includes(seen) ? current : [...current, seen]));
                  setActiveExplainer(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.setupActionButtonLabelPrimary}>{explainer.action} →</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
