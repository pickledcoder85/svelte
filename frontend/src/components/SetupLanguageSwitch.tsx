/**
 * The "English | Español" switch at the top of every setup screen. It changes the language at
 * once and saves it like Settings → Language (App's applyLanguage); setup drafts live in App,
 * so switching mid-setup keeps everything already entered.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage, useT, type Language } from '../i18n';
import { styles as shared } from '../screens/shared/styles';

export function SetupLanguageSwitch({ onChange }: { onChange: (language: Language) => void }): ReactElement {
  const t = useT();
  const { language } = useLanguage();
  const options: Array<{ id: Language; label: string }> = [
    { id: 'en', label: t('settings.language.english') },
    { id: 'es', label: t('settings.language.spanish') }
  ];
  return (
    <View
      style={[shared.unitToggle, styles.switch]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.language.label')}
    >
      {options.map((option) => {
        const active = language === option.id;
        return (
          <Pressable
            key={option.id}
            style={[shared.unitToggleOption, styles.option, active && shared.unitToggleOptionActive]}
            onPress={() => {
              if (!active) {
                onChange(option.id);
              }
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            hitSlop={6}
          >
            <Text style={[shared.unitToggleLabel, active && shared.unitToggleLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Small and out of the way: the top-right corner of the setup card.
  switch: {
    alignSelf: 'flex-end'
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6
  }
});
