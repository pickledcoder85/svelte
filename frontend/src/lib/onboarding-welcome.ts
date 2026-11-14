/** Copy for the first-run welcome card shown before the setup steps. */
export const ONBOARDING_WELCOME = {
  title: 'Welcome to Relish!',
  intro: "I'm Gherkin. Let's set up your nutrition and activity goals so your daily targets fit you.",
  sections: [
    { number: '1', title: 'About you', detail: 'Height, weight, age, and activity' },
    { number: '2', title: 'Your goal', detail: 'Lose, stay, or gain, and how fast' },
    { number: '3', title: 'How you eat', detail: 'Diet, nutrition style, and allergies' }
  ],
  footnote: 'Takes about 2 minutes. You can change anything later in Profile.',
  action: "Let's get started"
} as const;
