import type { TFunction } from '../i18n/translate';

/** Copy for the first-run welcome card shown before the setup steps, in `t`'s language. */
export function onboardingWelcome(t: TFunction) {
  return {
    title: t('setup.welcome.title'),
    intro: t('setup.welcome.intro'),
    sections: (['aboutYou', 'goal', 'eating'] as const).map((key, index) => ({
      number: String(index + 1),
      title: t(`setup.welcome.sections.${key}.title`),
      detail: t(`setup.welcome.sections.${key}.detail`)
    })),
    footnote: t('setup.welcome.footnote'),
    action: t('setup.welcome.action')
  };
}
