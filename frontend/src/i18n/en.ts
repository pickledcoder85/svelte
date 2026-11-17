/**
 * English strings, the source dictionary. Keys are grouped by screen; a `{name}` placeholder is
 * filled from t()'s vars, and an entry `{ one, other }` is a plural picked by `vars.count`.
 * Every key here must also exist in es.ts (TypeScript refuses a missing Spanish key).
 */
export const en = {
  common: {
    close: 'Close',
    cancel: 'Cancel',
    done: 'Done',
    clear: 'Clear',
    save: 'Save',
    saving: 'Saving…',
    adding: 'Adding…',
    add: 'Add',
    keep: 'Keep',
    delete: 'Delete',
    deleteConfirm: 'Delete?',
    skipConfirm: 'Skip?',
    loading: 'Loading…',
    less: 'Less',
    more: 'More',
    scanAgain: 'Scan again',
    takeFullPhoto: 'Take a full photo',
    deleteItem: 'Delete {name}',
    confirmDeleteItem: 'Confirm deleting {name}',
    skipItem: 'Skip {name}',
    confirmSkipItem: 'Confirm skipping {name}',
    kcal: '{value} kcal',
    /** P / C / F with grams, e.g. under a food. */
    macrosGrams: 'P {protein}g · C {carbs}g · F {fat}g',
    /** P / C / F without units, e.g. a meal's totals. */
    macrosShort: 'P {protein} · C {carbs} · F {fat}',
    minutes: '{minutes} min'
  },
  nav: {
    tabs: {
      today: 'Today',
      trends: 'Trends',
      plan: 'Plan'
    },
    weighIn: 'Weigh in',
    scanToLog: 'Scan a food to log it',
    account: 'Account: profile and settings',
    sections: {
      mealPlan: 'Meals',
      workoutPlan: 'Workouts',
      foods: 'Foods',
      recipes: 'Recipes',
      buildMeal: 'Build a meal',
      recentScans: 'Recent scans'
    }
  },
  account: {
    title: 'Account',
    profile: 'Profile',
    profileDetail: 'Body, goal, and targets',
    foodBank: 'Food bank',
    foodBankDetail: 'Your foods, recipes, and recent scans',
    shoppingLists: 'Shopping lists',
    shoppingListsDetail: 'Tick off what you buy',
    settings: 'Settings',
    settingsDetail: 'Appearance, units, nutrition, account',
    switchToPreview: 'Switch to preview',
    logOut: 'Log out',
    changeEntryMode: 'Change entry mode'
  },
  addFood: {
    titleToday: 'Add food to today',
    title: 'Add food',
    search: 'Search foods',
    searchDetail: 'Your foods first, then USDA (e.g. "green apple")',
    scan: 'Scan',
    scanDetail: 'Barcode, package front, or nutrition label',
    quickCalories: 'Quick calories',
    quickCaloriesDetail: 'Just a number, no lookup',
    suggest: 'Suggest a meal',
    suggestDetail: 'Gus picks a meal that fits what you have left'
  },
  day: {
    today: 'Today · {date}',
    yesterday: 'Yesterday · {date}',
    tomorrow: 'Tomorrow · {date}',
    goToToday: '{label}. Go to today',
    previous: 'Previous day',
    next: 'Next day',
    /** One letter per weekday, Sunday first. */
    letters: 'SMTWTFS',
    addToToday: 'Add to today',
    addToDay: 'Add to {day}',
    addedToToday: '✓ Added to today',
    addedToDay: '✓ Added to {day}'
  },
  meals: {
    title: 'Meals',
    addFood: 'Add a food',
    emptyTitle: 'Nothing eaten yet.',
    emptyHint: 'Tap + to search, scan, or add quick calories.',
    planned: 'Planned · {meal}',
    ateIt: '✓ Ate it',
    ateItem: 'I ate {name}',
    amountInGrams: 'Amount of {name} in grams',
    editAmount: '{name}, {grams} g. Tap to change the amount',
    slots: {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
      other: 'Other'
    },
    blocks: {
      breakfast: 'Breakfast',
      morning_snack: 'Morning snack',
      lunch: 'Lunch',
      afternoon_snack: 'Afternoon snack',
      dinner: 'Dinner'
    },
    /** The add buttons, per meal (Spanish needs the article). */
    addToToday: {
      breakfast: "Add to today's breakfast",
      lunch: "Add to today's lunch",
      dinner: "Add to today's dinner",
      snack: "Add to today's snack"
    },
    addToDay: {
      breakfast: "Add to {day}'s breakfast",
      lunch: "Add to {day}'s lunch",
      dinner: "Add to {day}'s dinner",
      snack: "Add to {day}'s snack"
    },
    addAllToToday: {
      breakfast: "Add all to today's breakfast",
      lunch: "Add all to today's lunch",
      dinner: "Add all to today's dinner",
      snack: "Add all to today's snack"
    },
    addAllToDay: {
      breakfast: "Add all to {day}'s breakfast",
      lunch: "Add all to {day}'s lunch",
      dinner: "Add all to {day}'s dinner",
      snack: "Add all to {day}'s snack"
    },
    mealPicker: 'Meal'
  },
  today: {
    finishSetup: 'Finish setup to see your daily calories.',
    errors: {
      add: 'Unable to add food log entry.',
      update: 'Unable to update this entry.',
      delete: 'Unable to delete this entry.',
      signInToEdit: 'Sign in again to edit this entry.',
      gramsAboveZero: 'Enter an amount in grams greater than 0.',
      logWater: 'Unable to log water.',
      undo: 'Unable to undo.'
    }
  },
  macros: {
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    ringLabel: '{label}: {eaten} of {target} grams',
    ringOver: ', {amount} over',
    grams: '{grams} g',
    of: 'of {target}'
  },
  budget: {
    left: '{value} kcal left',
    over: '{value} kcal over',
    captionEaten: 'Eaten {value}',
    captionWorkouts: 'Workouts +{value}',
    lines: {
      target: 'Target',
      workoutsShare: 'Workouts ({percent}%)',
      workoutsOff: 'Workouts (off)',
      allowance: 'Allowance',
      eaten: 'Eaten',
      remaining: 'Remaining',
      over: 'Over'
    },
    bars: {
      bmr: 'At rest (BMR)',
      activity: 'Daily activity',
      workouts: 'Workouts (active)'
    },
    pace: {
      deficit: 'Your pace (deficit)',
      surplus: 'Your pace (surplus)',
      even: 'Your pace'
    },
    showBreakdown: '{headline}. Show the breakdown',
    hideBreakdown: '{headline}. Hide the breakdown',
    hide: 'Hide ▴',
    breakdown: 'Breakdown ▾',
    todaysBudget: "Today's budget",
    openHistory: 'Open history in Trends',
    keptNote:
      "{kept} workout kcal aren't added back{share}, so today's deficit is a little bigger than your target alone. Change this in Settings → Workout calories.",
    keptShare: ' (you add {percent}%)',
    whereFrom: 'Where your target comes from',
    targetNote:
      "Your target is what you burn at rest and with everyday movement, plus your pace. Workouts aren't in the target; they're added on the day you do them."
  },
  water: {
    title: '💧 Water',
    summary: '{glasses} of {goal} glasses · {volume}',
    progress: "Water: {percent}% of today's goal",
    undoLast: 'Undo last',
    undoLastA11y: 'Undo the last drink',
    addGlass: '＋ Glass',
    addGlassA11y: 'Add a glass of water',
    addGlassHint: 'Press and hold to add a bottle',
    addBottle: '＋ Bottle',
    addBottleA11y: 'Add a bottle of water',
    today: 'Today',
    nothingLogged: 'nothing logged'
  },
  workouts: {
    title: 'Workouts',
    add: 'Add a workout',
    emptyToday: 'No workouts today.',
    emptyDay: 'No workouts this day.',
    emptyHint: 'Garmin workouts show up here on their own, or tap + to add one.',
    planned: 'Planned',
    markDone: 'Mark {name} done',
    done: '✓ Done',
    showDetail: '{name}: show how its calories are counted',
    activities: {
      walk: 'Walk',
      run: 'Run',
      bike: 'Bike',
      swim: 'Swim',
      strength: 'Strength',
      other: 'Other'
    },
    efforts: {
      easy: 'Easy',
      moderate: 'Moderate',
      hard: 'Hard'
    },
    effortHints: {
      easy: 'can chat',
      moderate: 'breathing harder',
      hard: 'few words'
    },
    duration: {
      minutes: '{minutes} min',
      hours: '{hours} h',
      hoursMinutes: '{hours} h {minutes} min'
    },
    sheet: {
      title: 'Add a workout',
      activity: 'Activity',
      namePlaceholder: 'What was it? e.g. Pickleball',
      nameA11y: 'Workout name',
      howLong: 'How long',
      durationA11y: 'Duration in minutes',
      effort: 'Effort',
      distance: 'Distance (optional, sets the pace)',
      distanceMiles: 'Distance in miles',
      distanceKm: 'Distance in kilometers',
      watchTotal: 'Your watch’s total',
      watchA11y: 'Calories your watch says',
      watchNote: 'Relish takes off your resting calories for these minutes (your target already counts them).',
      ownEstimate: ' Its own estimate: ≈ {value} kcal active.',
      useEstimate: 'Use Relish’s estimate',
      estimate: '≈ {value} kcal active',
      estimating: 'Estimating…',
      fromPace: 'from your pace · MET {met}',
      fromEffort: '{effort} {activity} · MET {met}',
      atWeight: ' · at {weight}',
      typicalWeight: ' · using a typical weight (weigh in for a better estimate)',
      myWatch: 'My watch says…',
      error: 'Unable to add the workout.'
    },
    detail: {
      from: ' · from {source}',
      recorded: '{source} recorded',
      relishCounts: 'Relish counts',
      addedShare: 'Added to today ({percent}%)',
      addedOff: 'Added to today (off)',
      estimatedByRelish: 'Estimated by Relish',
      fromPace: 'From your pace',
      metPart: ', MET {met}',
      atWeight: ' at {weight}',
      estimateNote: '{basis}{met}{weight}.',
      metFormula:
        'Active calories = (MET − 1) × weight × hours: the 1 MET you burn at rest is left out because your target already counts it.',
      watchSaid: 'Your watch said',
      restingYourBmr: 'Resting (your BMR)',
      activeCounted: 'Active, counted',
      watchNote:
        'Your watch’s total includes the calories you’d burn anyway at rest; Relish takes off its own resting estimate (the same BMR as your target) so they aren’t counted twice.',
      youLogged: 'You logged',
      loggedNote: 'Logged in Relish. Your number is used as active calories.',
      totalBurned: 'Total burned',
      restingTheirs: 'Resting (their estimate)',
      active: 'Active',
      restingSource: "Resting ({source}'s, until setup)",
      editedNote: 'You edited the calories for this workout; your number is used.',
      countsMore:
        "Relish counts {value} more than {source}'s active number because your resting estimate differs from theirs. Relish uses the same BMR as your target, so resting calories are never counted twice.",
      countsLess:
        "Relish counts {value} less than {source}'s active number because your resting estimate differs from theirs. Relish uses the same BMR as your target, so resting calories are never counted twice.",
      shareOnly:
        'Only {percent}% of the active calories is added to today because watch estimates tend to run high. Change this in Settings → Workout calories.',
      shareNone:
        'None of the active calories is added to today because watch estimates tend to run high. Change this in Settings → Workout calories.',
      keptAsRecorded: "{source}'s numbers are kept as recorded. Relish's are worked out once, when the workout comes in."
    }
  },
  weighIn: {
    title: 'Weigh in · today',
    kilograms: 'Kilograms',
    pounds: 'Pounds',
    tenths: 'Tenths',
    last: 'Last: {weight} {unit} {when}',
    whenToday: 'today',
    whenOn: 'on {date}',
    weekChange: '{change} {unit} in a week',
    saved: 'Saved {weight} for today',
    saveFailed: "Couldn't save: {message}",
    saveFailedGeneric: "Couldn't save the weigh-in"
  },
  foodSheet: {
    favorite: 'Favorite',
    per100: 'Nutrition listed per 100 g',
    serving: '1 serving = {serving}',
    fromBank: 'From your food bank',
    newOnSave: 'New: saved to your food bank when you add or save it',
    newSaved: 'New: saved to your food bank',
    servings: 'Servings',
    weight: 'Weight ({unit})',
    weightIn: 'Weight in {unit}',
    per100Hint: 'How many grams did you use? Check the package for the serving weight.',
    enterWeight: 'Enter a weight.',
    saveOnly: 'Save to food bank only',
    addError: 'Unable to add this food.',
    saveError: 'Unable to save this food.'
  },
  quickCalories: {
    title: 'Quick calories',
    calories: 'Calories',
    namePlaceholder: 'What was it? (optional)',
    name: 'Name',
    inUnit: '{label} in {unit}',
    error: 'Unable to add.'
  },
  search: {
    title: 'Search foods',
    placeholder: 'Your foods or USDA, e.g. green apple',
    mostUsed: 'Your foods, most used first',
    nothingFound: 'Nothing found. Try fewer words.',
    noSavedFoods: 'No saved foods yet. Search for one.',
    yourFood: 'Your food',
    error: 'Search failed.'
  },
  scan: {
    lookingUpBarcode: 'Looking up the barcode…',
    reading: 'Reading…',
    barcodeNotFound: "We couldn't find this product's nutrition. Scan the nutrition label: it'll be saved with the barcode for next time.",
    barcodeFailed: 'Barcode lookup failed.',
    failed: 'Scan failed.',
    unreadable: "Couldn't read that.",
    numbersUnreadable: "Couldn't read the numbers. Hold the label a little closer and try again.",
    noName: "The label doesn't show the product's name: you can rename it in Foods.",
    thisProduct: 'this product',
    noNutrition: 'No nutrition found for {name}. Scan its nutrition label for the numbers.',
    notSaved: "The food couldn't be saved.",
    searchAction: '🔎 Search',
    quickCaloriesAction: '✏️ Quick calories',
    scanLabelForExact: 'Scan the nutrition label for exact numbers',
    scanTheLabel: 'Scan the label',
    notFound: 'Not found',
    scanNutritionLabel: 'Scan the nutrition label',
    scanner: {
      title: 'Scan',
      barcodeTitle: 'Scan a barcode',
      starting: 'Starting the camera…',
      holdLabel: 'Hold the Nutrition Facts panel in the frame and keep still: it captures by itself.',
      holdAnything: 'Barcode, package, nutrition label, or a plate of food. Hold it in the frame and keep still: it captures by itself.',
      holdBarcode: 'Hold the barcode inside the box. It reads by itself.',
      takePhotoInstead: 'Take photo instead',
      hints: {
        bringItIn: 'Bring the package or label into the frame',
        holdSteady: 'Hold steady…',
        tooBlurry: 'Move a little closer or farther until it’s sharp',
        nothingToRead: 'Point at the package or its nutrition label',
        holdStill: 'Hold still…'
      }
    },
    plate: {
      title: 'On your plate',
      intro: 'Portions are estimated from the photo: adjust with − / + if they look off.',
      usda: 'USDA: {name}',
      photoEstimate: 'Estimate from the photo (no USDA match)',
      remove: 'Remove {name}',
      less: 'Less {name}',
      more: 'More {name}',
      nothingLeft: 'Nothing left to add.',
      total: 'Total',
      estimateNote: "Items without a USDA match use the photo's own estimate and are logged as quick calories.",
      addRest: 'Add the rest',
      estimateName: '{name} (estimate, {grams} g)',
      error: 'Unable to add these foods.',
      partial: 'Some items were added (marked ✓). The rest failed: {message}'
    }
  },
  suggest: {
    title: '✨ Gus suggests',
    whichMeal: 'Which meal',
    havePlaceholder: "Anything you'd like to use? (optional) e.g. chicken, rice",
    haveA11y: 'Ingredients you have',
    photo: 'Photo of my ingredients',
    photoDetail: 'Fridge, counter, or pantry',
    letGusChoose: 'Let Gus choose',
    letGusChooseDetail: "From what's left today",
    thinking: 'Gus is thinking…',
    budget: '{block} budget: {calories} kcal · P {protein} · C {carbs} · F {fat}',
    leftToday: '({calories} kcal left today)',
    sees: 'Gus sees: {items}',
    leftOut: 'Left out (no nutrition data): {items}',
    planned: 'You planned “{title}” ({calories} kcal) for {block}.',
    replacePlanned: 'Replace planned',
    keepPlanned: 'Keep planned',
    logIt: 'Log it',
    stuck: 'Gus is stuck. Try again.',
    partial: 'Some of it was added; tap Log it again to add the rest. ({message})',
    errorWord: 'error',
    logError: 'Unable to log this meal.',
    photoError: 'That photo could not be used.'
  },
  shopping: {
    title: '🛒 Shopping lists',
    allLists: 'All shopping lists',
    lists: '‹ Lists',
    share: 'Share',
    notSavedYet: 'Not saved yet: saves when you’re back online.',
    allDoneAsk: 'All done 🎉 Delete this list?',
    addPlaceholder: '＋ Add item, e.g. coffee',
    addA11y: 'Add an item',
    tapAgainToDelete: 'Tap again to delete this list',
    deleteList: 'Delete list',
    opening: 'Opening…',
    empty: 'No shopping lists yet. Create a Meal Plan, then tap “Make a shopping list”.',
    deleted: 'List deleted.',
    copied: 'Copied.',
    progress: {
      empty: 'Empty',
      allDone: 'All done',
      left: '{remaining} of {total} left'
    },
    shareAllDone: 'All done.',
    roles: {
      protein: 'Protein',
      carb: 'Carbs and grains',
      veg: 'Vegetables',
      fruit: 'Fruit',
      fat: 'Fats and oils',
      other: 'Other'
    },
    errors: {
      load: 'Unable to load shopping lists.',
      open: 'Unable to open the list.',
      add: 'Unable to add the item.',
      delete: 'Unable to delete the list.'
    }
  },
  settings: {
    language: {
      label: 'Language',
      // Each language is named in itself, so both read the same in either dictionary.
      english: 'English',
      spanish: 'Español',
      hint: 'Saved to your profile. Applies right away.',
      error: 'Unable to change the language.'
    }
  },
  /** First-run setup: the welcome card, the explainer cards, and the wizard steps. */
  setup: {
    welcome: {
      title: 'Welcome to Relish!',
      intro: "I'm Gherkin. Let's set up your nutrition and activity goals so your daily targets fit you.",
      sections: {
        aboutYou: { title: 'About you', detail: 'Height, weight, age, and activity' },
        goal: { title: 'Your goal', detail: 'Lose, stay, or gain, and how fast' },
        eating: { title: 'How you eat', detail: 'Diet, nutrition style, and allergies' }
      },
      footnote: 'Takes about 2 minutes. You can change anything later in Profile.',
      action: "Let's get started"
    },
    explainers: {
      activity: {
        title: 'Your day, not your workouts',
        intro: 'Next, tell me how much you move on a normal day: walking, chores, errands, and your job.',
        workouts: "Don't count workouts. You'll log those in Tracker, and they add to that day's allowance.",
        baseline: 'This sets your baseline: what you burn on an ordinary day.',
        action: 'Got it'
      },
      goal: {
        title: 'Your goal is about food',
        intro: 'Your daily calorie target comes from your baseline and your goal. It is what you eat to stay on pace.',
        covers: 'It covers your diet and everyday movement.',
        workouts: 'Workouts you log add to your daily allowance, so you can eat a bit more and still stay on pace.',
        action: 'Got it'
      }
    },
    steps: {
      basics: 'About you',
      activity: 'Activity',
      goal: 'Your goal',
      pace: 'Pace or focus',
      diet: 'Diet',
      style: 'Nutrition style',
      balance: 'Meal balance',
      allergies: 'Allergies',
      review: 'Review'
    },
    progress: {
      label: 'Step {step} of {total}: {name}',
      count: '{step} of {total}'
    },
    status: {
      saving: 'Saving profile...',
      issue: 'There is a setup issue to fix'
    },
    nav: {
      back: 'Back',
      next: 'Next',
      create: 'Create profile',
      saving: 'Saving...'
    },
    kcalPerDay: '{value} kcal a day',
    weeklyRate: 'about {value} {unit} a week',
    /** "mid-February 2027": a rough date for reaching a goal weight. */
    approximateDate: {
      early: 'early-{month} {year}',
      mid: 'mid-{month} {year}',
      late: 'late-{month} {year}'
    },
    units: {
      years: 'years',
      ageValue: '{value} years',
      heightCm: 'Height, centimetres',
      heightFeet: 'Height, feet',
      heightInches: 'Height, inches',
      kilograms: '{name}, kilograms',
      pounds: '{name}, pounds',
      ageYears: 'Age, years'
    },
    body: {
      title: 'About you',
      intro: 'We use these to estimate how many calories your body uses each day.',
      units: 'Units',
      name: 'Your name',
      namePlaceholder: 'What should I call you?',
      sex: 'Sex',
      male: 'Male',
      female: 'Female',
      height: 'Height',
      weight: 'Weight',
      age: 'Age',
      goalWeight: 'Goal weight',
      choose: 'Choose',
      noGoalWeight: 'No goal weight'
    },
    activity: {
      title: 'Daily activity',
      intro: 'Count everyday movement like walking, chores, and your job. Workouts are tracked separately.',
      bmrLink: "What's BMR?",
      hideBmr: 'Hide BMR info',
      bmrExplainer:
        'BMR (basal metabolic rate) is the energy your body needs at complete rest: breathing, circulation, staying warm. Relish estimates it from your height, weight, age, and sex with the Mifflin-St Jeor formula. With your activity added, that is about what you burn in a day: eat that much and your weight stays put.',
      atRest: 'At rest (BMR)',
      withActivity: 'With your activity',
      fromActivity: '+{value} from activity',
      sliderLabel: 'Daily activity level',
      levelPosition: '{level}, {index} of {total}',
      captionLabel: '{level}, {index} of {total}. {description}, {steps}.',
      levels: {
        sedentary: { title: 'Sedentary', description: 'Mostly sitting', steps: '< 5,000 steps' },
        light: { title: 'Light', description: 'Some walking', steps: '5,000–7,500 steps' },
        moderate: { title: 'Moderate', description: 'On your feet often', steps: '7,500–10,000 steps' },
        very_active: { title: 'Very active', description: 'On your feet most of the day', steps: '10,000–15,000 steps' },
        extra_active: { title: 'Extra active', description: 'Physical work all day', steps: '15,000+ steps' }
      }
    },
    goal: {
      title: 'Your goal',
      youBurn: 'You burn about {calories}.',
      about: 'About {calories}',
      options: {
        lose: { title: 'Lose Weight', detail: 'Eat a little less than you burn' },
        maintain: { title: 'Maintain Weight', detail: 'Eat about what you burn' },
        gain: { title: 'Gain Weight', detail: 'Eat a little more than you burn' }
      }
    },
    pace: {
      titleFocus: 'Your focus',
      titleHowFast: 'How fast?',
      introFocus: 'Same calories either way. Your focus changes how they split between protein, carbs, and fat.',
      introPace: 'A slower pace is easier to keep up. You can change it any time.',
      lose: 'Lose {rate}',
      gain: 'Gain {rate}',
      below: 'Below the {minimum} recommended minimum',
      belowFloorOff: 'Below the {minimum} recommended minimum (floor off)',
      usingMinimum: 'Calculated {calculated} · using the recommended minimum',
      wrongDirection:
        'At the {minimum} minimum you would not lose weight, because it is above what you burn. Move more to keep this pace, or tap this pace to opt out of the minimum.',
      goalWeightOptional: 'Goal weight (optional)',
      estimate: {
        one: 'At this pace: about {count} week, around {date}.',
        other: 'At this pace: about {count} weeks, around {date}.'
      },
      goalBelowCurrent: 'Goal weight should be below your current weight.',
      goalAboveCurrent: 'Goal weight should be above your current weight.',
      options: {
        lose: {
          light: { title: 'Steady' },
          recommended: { title: 'Recommended', note: 'Best balance for most people' },
          extreme: { title: 'Fast', note: 'Harder to keep up' }
        },
        maintain: {
          steady: { title: 'Stay steady', note: 'Balanced protein, carbs, and fat' },
          build_muscle: { title: 'Build muscle', note: 'More protein, for strength training' },
          fuel_training: { title: 'Fuel training', note: 'More carbs, for endurance training' }
        },
        gain: {
          lean: { title: 'Lean', note: 'Slow and steady' },
          aggressive: { title: 'Faster', note: 'More of the gain may be fat' }
        }
      }
    },
    floor: {
      title: 'Below the recommended minimum',
      useMinimum: 'Use {value} kcal',
      recommended: 'Recommended',
      keep: 'Keep {value} kcal',
      optOut: 'Opt out of the minimum',
      maintaining: 'Maintaining',
      thisPace: 'This pace',
      recommendedMinimum: 'Recommended minimum',
      forMen: 'for men',
      forWomen: 'for women',
      risk: 'Going lower without a doctor makes it hard to get enough protein and nutrients, and raises the risk of muscle loss, fatigue, and regaining the weight.',
      better: 'Better:',
      betterDetail: 'eat {minimum} kcal and burn the other {extra} kcal by moving more, like a longer daily walk.',
      veryLow: 'Under {limit} kcal a day is a very-low-calorie diet, normally done only with medical supervision.',
      hint: 'Opting out turns off the minimum. You can change it in Settings.'
    },
    diet: {
      title: 'How you eat',
      intro: "Helps Relish suggest foods and meals that fit. It doesn't change your calories.",
      options: {
        vegan: { title: 'Vegan', subtitle: 'Plants only' },
        vegetarian: { title: 'Vegetarian', subtitle: 'No meat or fish' },
        pescatarian: { title: 'Pescatarian', subtitle: 'Fish, dairy, and plants' },
        omnivore: { title: 'Omnivore', subtitle: 'Balanced mixed diet' },
        carnivore: { title: 'Carnivore', subtitle: 'Animal-based focus' }
      }
    },
    style: {
      title: 'Nutrition style',
      intro: 'The kind of eating you prefer. You can change it any time in Profile.',
      options: {
        balanced: { title: 'Balanced', subtitle: 'Flexible mixed approach' },
        high_protein: { title: 'High protein', subtitle: 'Protein at every meal, for strength and keeping muscle' },
        low_carb: { title: 'Low carb', subtitle: 'Fewer carbs: about 50–130 g a day' },
        keto: { title: 'Keto', subtitle: 'Very low carb: under about 50 g a day, higher fat' },
        mediterranean: { title: 'Mediterranean', subtitle: 'Whole foods, olive oil, fish, plants' },
        paleo: { title: 'Paleo', subtitle: 'Meat, fish, vegetables, fruit, and nuts; no grains or dairy' }
      }
    },
    balance: {
      title: 'How do you balance your meals?',
      intro:
        "How your day's calories split across breakfast, lunch, and dinner. Gus uses it to size the meals he plans. You can change it any time in Profile.",
      defaultSuffix: ' (default)',
      split: 'Breakfast {breakfast}% · Lunch {lunch}% · Dinner {dinner}%',
      styles: {
        balanced: { label: 'Balanced', detail: 'About the same at each meal' },
        'big-breakfast': { label: 'Big breakfast', detail: 'Start the day with the biggest meal' },
        'big-lunch': { label: 'Big lunch', detail: 'The main meal in the middle of the day' },
        'big-dinner': { label: 'Big dinner', detail: 'Lighter by day, the main meal in the evening' },
        'taper-down': { label: 'Taper down', detail: 'Big breakfast, getting lighter to a light dinner' },
        'build-up': { label: 'Build up', detail: 'Light breakfast, building up to a big dinner' }
      }
    },
    allergies: {
      title: 'Allergies and foods to avoid',
      intro: 'Pick all that apply, or None. Saved to your profile.',
      other: 'Other',
      otherPlaceholder: 'For example sesame or soy',
      /** How a typed allergy reads in the review list. */
      otherEntry: 'Other: {text}',
      options: {
        none: { title: 'None', subtitle: 'No major food allergies' },
        milk: { title: 'Milk', subtitle: 'Avoid dairy milk proteins' },
        egg: { title: 'Egg', subtitle: 'Avoid eggs and egg ingredients' },
        peanut: { title: 'Peanut', subtitle: 'Avoid peanuts' },
        tree_nuts: { title: 'Tree nuts', subtitle: 'Avoid almonds, cashews, walnuts' },
        wheat: { title: 'Wheat', subtitle: 'Avoid wheat-based foods' },
        shellfish: { title: 'Shellfish', subtitle: 'Avoid shrimp, crab, lobster' },
        other: { title: 'Other', subtitle: 'Add a custom restriction' }
      }
    },
    review: {
      title: 'Looking good!',
      titleNamed: 'Looking good, {name}!',
      intro: 'Check everything, then create your profile. You can change any of this later.',
      dailyTarget: 'Your daily target',
      macros: 'Protein {protein} g · Carbs {carbs} g · Fat {fat} g',
      floorOffBelow: 'Below the recommended minimum (calorie floor off)',
      floorOffFuture: 'Calorie floor off: future targets can go below the recommended minimum',
      setToMinimum: 'Set to the recommended minimum',
      rows: {
        basics: 'About you',
        activity: 'Daily activity',
        goal: 'Goal',
        diet: 'How you eat',
        style: 'Nutrition style',
        balance: 'Meal balance',
        allergies: 'Avoid'
      },
      goalWeight: 'goal {weight}',
      notChosen: 'Not chosen',
      nothing: 'Nothing',
      edit: 'Edit',
      editRow: 'Edit {label}'
    },
    errors: {
      chooseSex: 'Choose your sex. It changes how your calories are estimated.',
      bodyMetric: 'Enter your height in cm and weight in kg.',
      bodyImperial: 'Enter your height in feet and inches (0-11) and weight in lb.',
      age: 'Enter your age.',
      goal: 'Choose a goal to continue.',
      diet: 'Choose how you eat to continue.',
      style: 'Choose a nutrition style to continue.',
      goalWeightNumber: 'Enter a goal weight as a number, or leave it empty.',
      goalWeightBelow: 'Goal weight should be below your current weight, or leave it empty.',
      goalWeightAbove: 'Goal weight should be above your current weight, or leave it empty.',
      dietPattern: 'Choose a dietary pattern before continuing.',
      styleBefore: 'Choose a nutrition style before continuing.',
      allergyOther: 'Add the custom allergy or exclusion before continuing.',
      validBody: 'Enter a valid age, height, and weight before continuing.',
      liveSession: 'Create a live local session before continuing to the app.',
      chooseAll: 'Choose your sex, goal, how you eat, and nutrition style before creating your profile.',
      complete: 'Unable to complete onboarding.'
    }
  }
} as const;
