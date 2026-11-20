import { Platform, StyleSheet } from 'react-native';

import { FIELD_BOX, FIELD_HEIGHT } from '../../components/FormField';
import { MASCOT_OUTLINE, tc } from '../../theme/palette';
import { RELISH_COLORS } from './constants';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: RELISH_COLORS.canvas
  },
  screen: {
    flex: 1,
    backgroundColor: RELISH_COLORS.canvas
  },
  content: {
    padding: 16,
    gap: 16
  },
  onboardingWelcomeCard: {
    alignItems: 'center',
    gap: 14
  },
  onboardingWelcomeImage: {
    ...MASCOT_OUTLINE,
    width: 170,
    height: 210
  },
  onboardingWelcomeTitle: {
    color: RELISH_COLORS.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center'
  },
  onboardingWelcomeTitleDisplay: {
    fontFamily: 'Ribeye_400Regular',
    fontWeight: '400'
  },
  onboardingWelcomeIntro: {
    color: RELISH_COLORS.text,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 420
  },
  onboardingWelcomeList: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 4
  },
  onboardingWelcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: tc.bg_ffffff,
    borderWidth: 1,
    borderColor: tc.line_e7e0cf
  },
  onboardingWelcomeBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RELISH_COLORS.text
  },
  onboardingWelcomeBadgeLabel: {
    color: tc.fg_f4efe4,
    fontWeight: '800'
  },
  onboardingWelcomeRowCopy: {
    flex: 1
  },
  onboardingWelcomeRowTitle: {
    color: RELISH_COLORS.text,
    fontSize: 15,
    fontWeight: '800'
  },
  onboardingWelcomeRowDetail: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    marginTop: 2
  },
  onboardingWelcomeFootnote: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    textAlign: 'center'
  },
  onboardingWelcomeAction: {
    alignSelf: 'stretch'
  },
  launchSplash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.bg_f4efe4
  },
  setupBackdrop: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8
  },
  setupCard: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: tc.bg_ffffff,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tc.line_dde6ee,
    padding: 18,
    gap: 14,
    shadowColor: '#132536',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  bmrLink: {
    color: tc.fg_2f6b4f,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  bmrLinkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8
  },
  bmrExplainer: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    lineHeight: 19
  },
  setupGoalCalories: {
    color: RELISH_COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4
  },
  paceRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  paceRowCalories: {
    color: RELISH_COLORS.text,
    fontSize: 13,
    fontWeight: '800'
  },
  // A calculated target below the recommended minimum, before the user decides (or opted out).
  allergyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  allergyTile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    backgroundColor: tc.bg_f7f4ef
  },
  allergyIcon: {
    fontSize: 22
  },
  allergyLabel: {
    flex: 1,
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '700'
  },
  allergyCheck: {
    width: 22,
    height: 22,
    borderRadius: 7
  },
  // An emoji at the left of a setup choice row.
  setupIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  setupIconRowCopy: {
    flex: 1,
    gap: 2
  },
  setupIcon: {
    fontSize: 30,
    width: 40,
    textAlign: 'center'
  },
  setupCheckBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: tc.line_cbd5e1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  setupCheckBoxActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  setupCheckMark: {
    color: tc.fg_ffffff,
    fontSize: 15,
    fontWeight: '800'
  },
  reviewTarget: {
    ...FIELD_BOX,
    padding: 16,
    gap: 4
  },
  reviewTargetLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  reviewTargetValue: {
    color: tc.fg_132536,
    fontSize: 26,
    fontWeight: '800'
  },
  reviewTargetMacros: {
    color: tc.fg_5c6d80,
    fontSize: 14
  },
  reviewList: {
    gap: 2
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tc.line_dbe3ec
  },
  reviewRowCopy: {
    flex: 1,
    gap: 2
  },
  reviewRowLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '700'
  },
  reviewRowValue: {
    color: tc.fg_132536,
    fontSize: 16
  },
  reviewEdit: {
    color: tc.fg_0f766e,
    fontSize: 15,
    fontWeight: '700'
  },
  explainerActions: {
    alignSelf: 'stretch'
  },
  paceRowCaloriesBelow: {
    color: tc.fg_b42318
  },
  paceRowWarning: {
    color: tc.fg_b45309,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  goalWeightBlock: {
    gap: 6
  },
  goalWeightEstimate: {
    color: RELISH_COLORS.text,
    fontSize: 13
  },
  setupProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  setupProgressTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4
  },
  setupProgressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: tc.bg_e3dccb
  },
  setupProgressSegmentDone: {
    backgroundColor: RELISH_COLORS.text
  },
  setupProgressCount: {
    color: tc.fg_66778c,
    fontSize: 12,
    fontWeight: '700'
  },
  setupIntroText: {
    color: tc.fg_5b6b62,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -6
  },
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: 12,
    backgroundColor: tc.bg_ece6d6
  },
  unitToggleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9
  },
  unitToggleOptionActive: {
    backgroundColor: tc.bg_ffffff
  },
  unitToggleLabel: {
    color: tc.fg_5b6b62,
    fontSize: 13,
    fontWeight: '700'
  },
  unitToggleLabelActive: {
    color: RELISH_COLORS.text
  },
  setupSegmentRow: {
    flexDirection: 'row',
    gap: 10
  },
  // Same height as the picker fields, so every row on About you lines up.
  setupSegmentChoice: {
    ...FIELD_BOX,
    flex: 1,
    height: FIELD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  setupSegmentLabel: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '600'
  },
  setupPanel: {
    gap: 14
  },
  setupChoiceCardActive: {
    backgroundColor: tc.bg_eef3f8,
    borderColor: tc.line_17324d
  },
  setupChoiceTitle: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '800'
  },
  setupChoiceTitleActive: {
    color: tc.fg_17324d
  },
  setupChoiceDetail: {
    color: tc.fg_66778c,
    fontSize: 12,
    lineHeight: 17
  },
  setupGoalGrid: {
    flexDirection: 'column',
    gap: 10
  },
  setupGoalCard: {
    width: '100%',
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    alignItems: 'center'
  },
  setupGoalCardActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  setupGoalImage: {
    ...MASCOT_OUTLINE,
    width: '100%',
    height: 72
  },
  setupGoalNote: {
    color: tc.fg_0f766e,
    fontSize: 11,
    fontWeight: '700'
  },
  setupOptionStack: {
    gap: 10
  },
  setupOptionRow: {
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 14,
    gap: 4
  },
  setupOptionRowActive: {
    backgroundColor: tc.bg_eef3f8,
    borderColor: tc.line_17324d
  },
  setupFooter: {
    gap: 10,
    paddingTop: 4
  },
  setupNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  setupActionButton: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  setupActionButtonPrimary: {
    backgroundColor: tc.bg_17324d
  },
  setupActionButtonSecondary: {
    backgroundColor: tc.bg_ffffff,
    borderWidth: 1,
    borderColor: tc.line_17324d
  },
  setupActionButtonLabelPrimary: {
    color: tc.fg_ffffff,
    fontWeight: '800',
    fontSize: 15
  },
  setupActionButtonLabelSecondary: {
    color: tc.fg_17324d,
    fontWeight: '800',
    fontSize: 15
  },
  appHeader: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 0
  },
  appShellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  appHeaderTitleWrap: {
    gap: 2,
    flex: 1,
    minWidth: 0,
    paddingRight: 4
  },
  appShellActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },
  appBrandTitle: {
    color: tc.fg_132536,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800'
  },
  appBrandTitleDisplay: {
    fontFamily: 'Ribeye_400Regular',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '400',
    letterSpacing: 0.4
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    backgroundColor: tc.bg_f7f4ef,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  entryCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: RELISH_COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: RELISH_COLORS.stroke,
    padding: 18,
    gap: 14,
    shadowColor: '#163127',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  entryCardHeader: {
    gap: 4
  },
  entryCardEyebrow: {
    color: RELISH_COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase'
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RELISH_COLORS.primary,
    backgroundColor: RELISH_COLORS.primarySoft,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryButtonLabel: {
    color: RELISH_COLORS.primaryDeep,
    fontWeight: '800'
  },
  welcomeShell: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 18
  },
  welcomeAppName: {
    color: RELISH_COLORS.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'center'
  },
  welcomeAppNameDisplay: {
    fontFamily: 'Ribeye_400Regular',
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '400',
    letterSpacing: 0.8
  },
  welcomeSubtitle: {
    color: RELISH_COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3
  },
  welcomeMascotWrap: {
    width: 244,
    height: 244,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  welcomeMascotImage: {
    ...MASCOT_OUTLINE,
    width: 206,
    height: 206
  },
  welcomeActions: {
    width: '100%',
    maxWidth: 360,
    gap: 6,
    alignItems: 'center'
  },
  welcomePrimaryButton: {
    minWidth: 180,
    borderRadius: 18,
    backgroundColor: RELISH_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  welcomePrimaryButtonLabel: {
    color: tc.fg_ffffff,
    fontWeight: '800'
  },
  welcomeSecondaryButton: {
    minWidth: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RELISH_COLORS.primary,
    backgroundColor: RELISH_COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center'
  },
  welcomeSecondaryButtonLabel: {
    color: RELISH_COLORS.primaryDeep,
    fontWeight: '800'
  },
  welcomeLinkButton: {
    alignItems: 'center',
    paddingVertical: 6
  },
  welcomeLinkLabel: {
    color: RELISH_COLORS.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  welcomeStatusStrip: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tc.bg_fffaf0,
    gap: 2
  },
  welcomeStatusLabel: {
    color: RELISH_COLORS.text,
    fontSize: 12,
    fontWeight: '700'
  },
  welcomeStatusDetail: {
    color: tc.fg_8a5a1d,
    fontSize: 11,
    lineHeight: 16
  },
  entryAuthActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  exercisePresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  exercisePresetCard: {
    flexGrow: 1,
    flexBasis: 136,
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    padding: 12,
    gap: 6,
    alignItems: 'center'
  },
  exercisePresetCardActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  exercisePresetImage: {
    ...MASCOT_OUTLINE,
    width: '100%',
    height: 112
  },
  exercisePresetLabel: {
    color: tc.fg_132536,
    fontSize: 14,
    fontWeight: '800'
  },
  exercisePresetMeta: {
    color: tc.fg_66778c,
    fontSize: 12,
    textAlign: 'center'
  },
  panel: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 24,
    padding: 18,
    gap: 14
  },
  panelHeader: {
    gap: 6
  },
  panelEyebrow: {
    color: tc.fg_0f766e,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1
  },
  panelTitle: {
    color: tc.fg_132536,
    fontSize: 22,
    fontWeight: '800'
  },
  panelDetail: {
    color: tc.fg_66778c,
    fontSize: 13,
    lineHeight: 18
  },
  dashboardStack: {
    gap: 0
  },
  trendRangeRow: { flexDirection: 'row', gap: 6 },
  todayEditRow: { gap: 6 },
  todayEditControls: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  todayEditInput: {
    width: 80,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tc.line_d7dee7,
    paddingHorizontal: 10,
    fontSize: 16,
    color: tc.fg_132536,
    backgroundColor: tc.bg_ffffff
  },
  trendProjectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  trendProjectionLabel: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '600' },
  trendProjectionText: { color: tc.fg_17324d, fontSize: 14, lineHeight: 20, marginTop: 6 },
  trendPaceText: { color: tc.fg_5c6d80, fontSize: 13, fontWeight: '600' },
  trendPaceGood: { color: tc.fg_0f766e },
  trendPaceWarn: { color: tc.fg_b45309 },
  trendRange: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: tc.line_d7dee7 },
  trendRangeActive: { backgroundColor: tc.bg_17324d, borderColor: tc.line_17324d },
  trendRangeLabel: { color: tc.fg_132536, fontSize: 13, fontWeight: '700' },
  trendRangeLabelActive: { color: tc.fg_ffffff },
  trendHeadline: { color: tc.fg_132536, fontSize: 20, fontWeight: '800' },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 110,
    alignItems: 'center'
  },
  toastLabel: {
    overflow: 'hidden',
    backgroundColor: tc.bg_17324d,
    color: tc.fg_ffffff,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999
  },
  todayMealGroup: { gap: 0, marginTop: 6 },
  todayMealGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6 },
  todayMealGroupLabel: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  todayMealGroupRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayMealGroupMore: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  todayMealGroupMoreLabel: { color: tc.fg_5c6d80, fontSize: 18, fontWeight: '800' },
  todayMealGroupCalories: { color: tc.fg_5c6d80, fontSize: 12, fontWeight: '700' },
  todaySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tc.brand_primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  todayAddButtonLabel: { color: tc.fg_ffffff, fontSize: 24, lineHeight: 26, fontWeight: '600' },
  todayEmpty: { gap: 6, alignItems: 'flex-start' },
  todayHint: { color: tc.fg_6b7b90, fontSize: 13 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tc.line_e2e8f0
  },
  todayRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayRowTag: { color: tc.fg_0f766e, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  todayRemoveButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.bg_eef2f6
  },
  todayRemoveConfirm: { backgroundColor: tc.bg_fff4f0 },
  todayRemoveLabel: { color: tc.fg_5c6d80, fontSize: 14, fontWeight: '700' },
  todayRemoveConfirmLabel: { color: tc.fg_b42318 },
  homeSection: {
    paddingVertical: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: tc.line_dbe3ec
  },
  dailyHomeMacroRingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center'
  },
  mealPlanSlotCard: {
    backgroundColor: tc.bg_ffffff,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dfe7ef,
    padding: 14,
    gap: 10
  },
  mealPlanSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  mealPlanSlotTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12
  },
  mealPlanSlotTotal: {
    color: tc.fg_17324d,
    fontSize: 15,
    fontWeight: '800'
  },
  mealPlanItemList: {
    gap: 10,
    marginTop: 6
  },
  mealPlanItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12
  },
  mealPlanItemCopy: {
    flex: 1,
    paddingRight: 12
  },
  mealPlanItemName: {
    color: tc.fg_17324d,
    fontSize: 15,
    fontWeight: '700'
  },
  mealPlanItemQuantityInline: {
    color: tc.fg_7c8aa5,
    fontSize: 13,
    fontWeight: '500'
  },
  mealPlanItemInlineMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 16,
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  mealPlanItemMacroLine: {
    color: tc.fg_73859d,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right'
  },
  mealPlanItemCalories: {
    color: tc.fg_17324d,
    fontSize: 13,
    fontWeight: '700'
  },
  dailyHomeEmptyState: {
    color: tc.fg_66778c,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  scaleSelectorCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    padding: 14,
    gap: 12
  },
  scaleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  scaleSelectorLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  scaleSelectorValue: {
    color: tc.fg_17324d,
    fontSize: 18,
    fontWeight: '800'
  },
  scaleSelectorHint: {
    color: tc.fg_7c8aa5,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4
  },
  scaleSelectorRailWrap: {
    gap: 8
  },
  scaleSelectorRail: {
    height: 10,
    borderRadius: 999,
    backgroundColor: tc.bg_e2e8f0
  },
  scaleSelectorRailFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 10,
    borderRadius: 999,
    backgroundColor: tc.bg_0f766e
  },
  scaleSelectorStops: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: -2
  },
  scaleSelectorStop: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
    paddingBottom: 2
  },
  scaleSelectorDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc
  },
  scaleSelectorDotActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_17324d
  },
  scaleSelectorStopLabel: {
    color: tc.fg_7c8aa5,
    fontSize: 11,
    fontWeight: '700'
  },
  scaleSelectorStopLabelActive: {
    color: tc.fg_17324d
  },
  mealPlanDateStrip: {
    flexDirection: 'row',
    gap: 10
  },
  mealPlanDateCard: {
    minWidth: 96,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: tc.bg_f3f6fb,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    gap: 4
  },
  mealPlanDateCardActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  mealPlanDateWeekday: {
    color: tc.fg_6b7b90,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  mealPlanDateWeekdayActive: {
    color: tc.fg_dbe7f2
  },
  mealPlanDateLabel: {
    color: tc.fg_17324d,
    fontSize: 18,
    fontWeight: '800'
  },
  mealPlanDateLabelActive: {
    color: tc.fg_ffffff
  },
  mealPlanDateMeta: {
    color: tc.fg_66778c,
    fontSize: 12
  },
  mealPlanDateMetaActive: {
    color: tc.fg_dbe7f2
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  mealBuilderActionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  mealBuilderHint: {
    flex: 1,
    minWidth: 180,
    color: tc.fg_7c8aa5,
    fontSize: 12,
    lineHeight: 17
  },
  mealIngredientEditor: {
    gap: 10
  },
  mealIngredientRow: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  mealIngredientInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tc.bg_ffffff,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  mealIngredientInput: {
    minWidth: 64,
    color: tc.fg_17324d,
    fontWeight: '800',
    textAlign: 'right',
    fontSize: 16
  },
  mealIngredientUnit: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mealNameInput: {
    borderWidth: 1,
    borderColor: tc.line_d4dbe3,
    borderRadius: 16,
    backgroundColor: tc.bg_ffffff,
    color: tc.fg_132536,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  mealBuilderHeaderRow: {
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  mealServingWrap: {
    gap: 6,
    minWidth: 120
  },
  mealMetaLabel: {
    color: tc.fg_7a8797,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  mealServingInput: {
    borderWidth: 1,
    borderColor: tc.line_d4dbe3,
    borderRadius: 12,
    backgroundColor: tc.bg_ffffff,
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  mealBuilderHintWrap: {
    flex: 1,
    minWidth: 220
  },
  metricTile: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 18,
    padding: 14,
    gap: 6
  },
  metricTileCompact: {
    minWidth: 140
  },
  metricLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  metricValue: {
    color: tc.fg_17324d,
    fontWeight: '800',
    fontSize: 18
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tc.line_edf1f5
  },
  listTitle: {
    color: tc.fg_132536,
    fontSize: 15,
    fontWeight: '700'
  },
  listCaption: {
    color: tc.fg_7c8aa5,
    fontSize: 12
  },
  listMetric: {
    color: tc.fg_17324d,
    fontWeight: '700'
  },
  searchRow: {
    gap: 10
  },
  searchInput: {
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: tc.fg_132536,
    fontSize: 16
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: tc.bg_17324d,
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryButtonLabel: {
    color: tc.fg_ffffff,
    fontWeight: '800'
  },
  inlineStatus: {
    backgroundColor: tc.bg_fffaf0,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 4
  },
  inlineStatusLabel: {
    color: tc.fg_132536,
    fontWeight: '700'
  },
  inlineStatusDetail: {
    color: tc.fg_8a5a1d,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1
  },
  foodList: {
    gap: 8
  },
  entryDeleteConfirmLabel: {
    color: tc.fg_b42318
  },
  buttonDisabled: {
    opacity: 0.5
  },
  settingsInput: {
    ...FIELD_BOX,
    height: FIELD_HEIGHT,
    paddingHorizontal: 16,
    color: tc.fg_132536,
    fontSize: 16
  },
  settingsReadOnly: {
    gap: 2
  },
  settingsValue: {
    color: tc.fg_132536,
    fontSize: 16,
    fontWeight: '600'
  },
  settingsHint: {
    color: tc.fg_6b7b90,
    fontSize: 13
  },
  settingsLink: {
    color: tc.fg_0f766e,
    fontSize: 14,
    fontWeight: '700'
  },
  settingsMessage: {
    color: tc.fg_0f766e,
    fontSize: 14,
    fontWeight: '700'
  },
  settingsError: {
    color: tc.fg_b42318,
    fontSize: 14
  },
  floorCompare: {
    flexDirection: 'row',
    gap: 10
  },
  floorCompareTile: {
    ...FIELD_BOX,
    flex: 1,
    padding: 12,
    gap: 2
  },
  floorCompareLabel: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    fontWeight: '700'
  },
  floorCompareValue: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  floorCompareNote: {
    color: tc.fg_5c6d80,
    fontSize: 12
  },
  floorTip: {
    backgroundColor: tc.brand_primarySoft,
    borderRadius: 14,
    padding: 12
  },
  floorWarningText: {
    color: tc.fg_132536,
    fontSize: 15,
    lineHeight: 21
  },
  floorWarningStrong: {
    fontWeight: '800'
  },
  floorWarningHint: {
    color: tc.fg_5c6d80,
    fontSize: 13,
    lineHeight: 18
  },
  resetConfirmButton: {
    borderColor: tc.line_f2c8be,
    backgroundColor: tc.bg_fff4f0
  },
  foodRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_e2e8f0,
    backgroundColor: tc.bg_ffffff,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  foodCardCopy: {
    flex: 1,
    gap: 10
  },
  foodRowActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8
  },
  mealPlanLoggedRow: {
    borderColor: tc.line_0f766e,
    backgroundColor: tc.bg_effaf7
  },
  foodRowCopy: {
    flex: 1,
    gap: 2
  },
  foodRowActions: {
    alignItems: 'flex-end',
    gap: 8
  },
  foodRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start'
  },
  foodCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  foodCardChip: {
    backgroundColor: tc.bg_edf1f5,
    color: tc.fg_17324d,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700'
  },
  foodCardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    overflow: 'hidden',
    backgroundColor: tc.bg_ffffff
  },
  quantityStepperButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tc.bg_f8fafc
  },
  quantityStepperButtonLabel: {
    color: tc.fg_17324d,
    fontSize: 16,
    fontWeight: '800'
  },
  quantityStepperValue: {
    minWidth: 56,
    paddingHorizontal: 10,
    textAlign: 'center',
    color: tc.fg_17324d,
    fontWeight: '800'
  },
  mealPlanCheck: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.bg_ffffff
  },
  mealPlanCheckActive: {
    borderColor: tc.line_0f766e,
    backgroundColor: tc.bg_0f766e
  },
  mealPlanCheckLabel: {
    color: tc.fg_6b7b90,
    fontSize: 16,
    fontWeight: '800'
  },
  mealPlanCheckLabelActive: {
    color: tc.fg_ffffff
  },
  inlinePillButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_eef3f8,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  inlinePillButtonLabel: {
    color: tc.fg_17324d,
    fontSize: 12,
    fontWeight: '800'
  },
  inlinePillRow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cdd8e5,
    backgroundColor: tc.bg_f6f9fc,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  inlinePillText: {
    color: tc.fg_4c627a,
    fontSize: 12,
    fontWeight: '700'
  },
  inlinePillButtonComplete: {
    borderColor: tc.line_15803d,
    backgroundColor: tc.bg_edf8f1
  },
  inlinePillButtonLabelComplete: {
    color: tc.fg_15803d
  },
  listRowCopyFlex: {
    flex: 1,
    minWidth: 0
  },
  listRowActions: {
    alignItems: 'flex-end',
    gap: 8
  },
  listActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8
  },
  favoriteToggleButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_f59e0b,
    backgroundColor: tc.bg_fff8ea,
    alignItems: 'center',
    justifyContent: 'center'
  },
  favoriteToggleButtonActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  favoriteToggleButtonLabel: {
    color: tc.fg_b45309,
    fontSize: 16,
    fontWeight: '800'
  },
  favoriteToggleButtonLabelActive: {
    color: tc.fg_ffffff
  },
  recipeSection: {
    gap: 12
  },
  recipeRowTitleWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  recipeStarButton: {
    borderRadius: 999,
    backgroundColor: tc.bg_17324d,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  recipeStarButtonActive: {
    backgroundColor: tc.bg_0f766e
  },
  recipeStarButtonLabel: {
    color: tc.fg_ffffff,
    fontSize: 12,
    fontWeight: '800'
  },
  recipeAccordionCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    padding: 14,
    gap: 10
  },
  recipeAccordionCardActive: {
    borderColor: tc.line_17324d,
    backgroundColor: tc.bg_f7f4ef
  },
  recipeAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  recipeAccordionMeta: {
    alignItems: 'flex-end',
    gap: 6
  },
  recipeAccordionCaret: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '800'
  },
  recipeAccordionBody: {
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: tc.line_dbe3ec
  },
  detailCard: {
    backgroundColor: tc.bg_f7f4ef,
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  profileFieldStack: {
    gap: 12
  },
  profileFieldRow: {
    flexDirection: 'row',
    gap: 10
  },
  profileFieldHalf: {
    flex: 1,
    gap: 6
  },
  profileField: {
    gap: 6
  },
  profileFieldLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  profileFieldInput: {
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: tc.fg_132536,
    fontSize: 16
  },
  profileFieldInputError: {
    borderColor: tc.line_2563eb
  },
  profileFieldError: {
    color: tc.fg_1d4ed8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  },
  profileToggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  profileToggle: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tc.line_cbd5e1,
    backgroundColor: tc.bg_f8fafc,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  profileToggleActive: {
    backgroundColor: tc.bg_17324d,
    borderColor: tc.line_17324d
  },
  profileToggleLabel: {
    color: tc.fg_17324d,
    fontWeight: '700'
  },
  profileToggleLabelActive: {
    color: tc.fg_ffffff
  },
  goalCard: {
    backgroundColor: tc.bg_f8fafc,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tc.line_dbe3ec,
    padding: 14,
    gap: 10
  },
  goalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  goalMetaChip: {
    borderRadius: 999,
    backgroundColor: tc.bg_eef3f8,
    color: tc.fg_17324d,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700'
  },
  recipeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  recipeDetailHeaderCopy: {
    flex: 1,
    gap: 4
  },
  recipeMetaBlock: {
    gap: 6,
    paddingTop: 4
  },
  recipeMetaLabel: {
    color: tc.fg_6b7b90,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  recipeStep: {
    color: tc.fg_132536,
    fontSize: 13,
    lineHeight: 18
  },
  recipeMetaItem: {
    color: tc.fg_132536,
    fontSize: 13,
    lineHeight: 18
  },
  recipeDetailLoading: {
    gap: 8
  },
  recipeImportCard: {
    backgroundColor: tc.bg_f3efe8,
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  recipeSecondaryCard: {
    backgroundColor: tc.bg_f2f6fb,
    borderRadius: 20,
    padding: 16,
    gap: 10
  },
  detailTitle: {
    color: tc.fg_132536,
    fontSize: 20,
    fontWeight: '800'
  },
  detailSubtitle: {
    color: tc.fg_66778c
  },
  footer: {
    color: tc.fg_66778c,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 16
  }
});
