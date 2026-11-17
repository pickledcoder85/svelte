import { StatusBar } from 'expo-status-bar';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

import { toneColor } from '../lib/app-format';
import { tc } from '../theme/palette';
import { mascotDefaultImage } from './shared/constants';
import { styles } from './shared/styles';

export interface EntryScreenProps {
  ribeyeLoaded: boolean;
  ownerAccess: 'checking' | 'signin' | 'blocked';
  ownerAccessMessage: string | null;
  setOwnerCheckNonce: Dispatch<SetStateAction<number>>;
  entryIntent: 'signup' | 'signin' | null;
  setEntryIntent: Dispatch<SetStateAction<'signup' | 'signin' | null>>;
  setEntryEmailError: Dispatch<SetStateAction<string | null>>;
  setEntryError: Dispatch<SetStateAction<string | null>>;
  entryLoading: boolean;
  enterPreviewMode: () => void;
  entryEmailDraft: string;
  setEntryEmailDraft: Dispatch<SetStateAction<string>>;
  entryEmailError: string | null;
  entryDisplayNameDraft: string;
  setEntryDisplayNameDraft: Dispatch<SetStateAction<string>>;
  entryError: string | null;
  enterLiveMode: () => Promise<void>;
  entryBackendTone: 'checking' | 'live';
  entryBackendStatus: string;
  entryBackendDetail: string;
}

export function EntryScreen({
  ribeyeLoaded,
  ownerAccess,
  ownerAccessMessage,
  setOwnerCheckNonce,
  entryIntent,
  setEntryIntent,
  setEntryEmailError,
  setEntryError,
  entryLoading,
  enterPreviewMode,
  entryEmailDraft,
  setEntryEmailDraft,
  entryEmailError,
  entryDisplayNameDraft,
  setEntryDisplayNameDraft,
  entryError,
  enterLiveMode,
  entryBackendTone,
  entryBackendStatus,
  entryBackendDetail
}: EntryScreenProps): ReactElement {
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
          <View style={styles.welcomeShell}>
            <Text style={[styles.welcomeAppName, ribeyeLoaded && styles.welcomeAppNameDisplay]}>Relish</Text>
            <Text style={styles.welcomeSubtitle}>Fitness & Nutrition</Text>
            <View style={styles.welcomeMascotWrap}>
              <Image source={mascotDefaultImage} style={styles.welcomeMascotImage} resizeMode="contain" />
            </View>

            {ownerAccess === 'blocked' ? (
              <View style={styles.entryCard}>
                <View style={styles.entryCardHeader}>
                  <Text style={styles.entryCardEyebrow}>Private app</Text>
                  <Text style={styles.panelTitle}>Connect Tailscale to open Relish</Text>
                </View>
                <Text style={styles.welcomeStatusDetail}>{ownerAccessMessage}</Text>
                <Pressable
                  style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                  onPress={() => setOwnerCheckNonce((nonce) => nonce + 1)}
                  accessibilityRole="button"
                >
                  <Text style={styles.setupActionButtonLabelPrimary}>Try again</Text>
                </Pressable>
              </View>
            ) : ownerAccess === 'checking' ? (
              <View style={styles.entryCard}>
                <Text style={styles.welcomeStatusDetail}>Checking sign-in…</Text>
              </View>
            ) : entryIntent === null ? (
              <View style={styles.welcomeActions}>
                <Pressable
                  style={styles.welcomePrimaryButton}
                  onPress={() => {
                    setEntryEmailError(null);
                    setEntryError(null);
                    setEntryIntent('signup');
                  }}
                  disabled={entryLoading}
                >
                  <Text style={styles.welcomePrimaryButtonLabel}>Sign up</Text>
                </Pressable>
                <Pressable
                  style={styles.welcomeSecondaryButton}
                  onPress={() => {
                    setEntryEmailError(null);
                    setEntryError(null);
                    setEntryIntent('signin');
                  }}
                  disabled={entryLoading}
                >
                  <Text style={styles.welcomeSecondaryButtonLabel}>Sign in</Text>
                </Pressable>
                <Pressable style={styles.welcomeLinkButton} onPress={enterPreviewMode} disabled={entryLoading}>
                  <Text style={styles.welcomeLinkLabel}>Preview the app</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.entryCard}>
                <View style={styles.entryCardHeader}>
                  <Text style={styles.entryCardEyebrow}>
                    {entryIntent === 'signup' ? 'Sign up' : 'Sign in'}
                  </Text>
                  <Text style={styles.panelTitle}>
                    {entryIntent === 'signup' ? 'Create your profile' : 'Continue to your profile'}
                  </Text>
                </View>

                <View style={styles.profileFieldStack}>
                  <View style={styles.profileField}>
                    <Text style={styles.profileFieldLabel}>Email</Text>
                    <TextInput
                      value={entryEmailDraft}
                      onChangeText={(value) => {
                        setEntryEmailDraft(value);
                        setEntryEmailError(null);
                      }}
                      placeholder="dev@example.com"
                      placeholderTextColor={tc.fg_7c8aa5}
                      style={[styles.profileFieldInput, entryEmailError && styles.profileFieldInputError]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {entryEmailError ? <Text style={styles.profileFieldError}>{entryEmailError}</Text> : null}
                  </View>

                  {entryIntent === 'signup' ? (
                    <View style={styles.profileField}>
                      <Text style={styles.profileFieldLabel}>Display name</Text>
                      <TextInput
                        value={entryDisplayNameDraft}
                        onChangeText={setEntryDisplayNameDraft}
                        placeholder="Local Dev User"
                        placeholderTextColor={tc.fg_7c8aa5}
                        style={styles.profileFieldInput}
                      />
                    </View>
                  ) : null}
                </View>

                {entryError ? (
                  <View style={[styles.inlineStatus, { borderColor: toneColor('checking') }]}>
                    <Text style={styles.inlineStatusLabel}>Could not create local profile session</Text>
                    <Text style={styles.inlineStatusDetail}>{entryError}</Text>
                  </View>
                ) : null}

                <View style={styles.entryAuthActions}>
                  <Pressable
                    style={[styles.setupActionButton, styles.setupActionButtonSecondary]}
                    onPress={() => {
                      setEntryEmailError(null);
                      setEntryError(null);
                      setEntryIntent(null);
                    }}
                    disabled={entryLoading}
                  >
                    <Text style={styles.setupActionButtonLabelSecondary}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.setupActionButton, styles.setupActionButtonPrimary]}
                    onPress={() => void enterLiveMode()}
                    disabled={entryLoading}
                  >
                    <Text style={styles.setupActionButtonLabelPrimary}>
                      {entryLoading
                        ? 'Creating session...'
                        : entryIntent === 'signup'
                          ? 'Get started'
                          : 'Continue'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={[styles.welcomeStatusStrip, { borderColor: toneColor(entryBackendTone) }]}>
              <Text style={styles.welcomeStatusLabel}>{entryBackendStatus}</Text>
              <Text style={styles.welcomeStatusDetail}>{entryBackendDetail}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
