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
    },
    eyebrow: 'Settings',
    account: 'Account',
    name: 'Name',
    namePlaceholder: 'Your name',
    signedInAs: 'Signed in as',
    ownerSession: 'Through Tailscale on this device. No password needed.',
    localSession: 'Local session',
    preferences: 'Preferences',
    appearance: 'Appearance',
    appearanceOptions: {
      system: 'System',
      light: 'Light',
      dark: 'Dark'
    },
    followsPhoneDark: 'Follows your iPhone (dark right now). Saved on this device.',
    followsPhoneLight: 'Follows your iPhone (light right now). Saved on this device.',
    savedOnDevice: 'Saved on this device. Applies right away.',
    units: 'Units',
    timeZone: 'Time zone',
    usePhoneTimeZone: "Use this iPhone's time zone ({zone})",
    save: 'Save settings',
    nutrition: 'Nutrition',
    calorieFloor: 'Calorie floor',
    floorRecommended: 'Recommended',
    off: 'Off',
    floorOffHint: 'Off: your daily target is used as calculated, even below the recommended minimum.',
    floorOnHintMen: 'Your daily target never goes below {value} kcal, the minimum dietitians recommend for men.',
    floorOnHintWomen: 'Your daily target never goes below {value} kcal, the minimum dietitians recommend for women.',
    waterGoal: 'Water goal',
    glassesA11y: '{count} glasses',
    waterHint:
      'Glasses of {glass} a day: {total}. 8 glasses ({eight}) is a common goal; food and other drinks count toward what you need too.',
    waterReminders: 'Water reminders',
    workoutCalories: 'Workout calories',
    shareOffHint: "Off: workouts you log don't change your daily allowance.",
    shareHint:
      "{percent}% of the calories from each workout you log is added to that day's allowance, so you can eat a bit more and stay on pace. 75% is recommended: watch and app estimates tend to run high, and research suggests a workout raises your day's burn by less than the workout itself.",
    garmin: 'Garmin',
    syncing: 'Syncing…',
    syncNow: 'Sync now',
    garminHint:
      "Workouts sync every 30 minutes and when you open Relish. Garmin's numbers are kept as recorded. Relish counts the active part: the watch's total minus your own resting calories for those minutes, so resting calories aren't counted twice.",
    floorSheet: {
      title: 'Turn off the calorie floor?',
      keep: 'Keep the minimum',
      keepDetail: 'Recommended',
      turnOff: 'Turn it off',
      minimum: 'Dietitians generally recommend at least {minimum} unless a doctor is supervising. With the floor off, your target can go below that.',
      forMen: '{value} kcal a day for men',
      forWomen: '{value} kcal a day for women',
      risk: 'Eating less makes it hard to get enough protein, vitamins, and minerals, speeds up muscle loss, and often brings fatigue and rebound weight gain. Proceed with care.'
    },
    startOver: 'Start over',
    resetTitle: 'Reset profile',
    resetDetail:
      'Runs setup again from the welcome screen, and clears your goals and meal pattern (the meal-planning guide runs again). Your foods, logged meals and workouts, weigh-ins, and plans are kept. To change your weight or goal, edit the profile above instead.',
    resetting: 'Resetting…',
    resetConfirm: 'Tap again to reset and start setup',
    reset: 'Reset profile',
    about: 'About',
    aboutDetail:
      'Packaged food data from Open Food Facts (openfoodfacts.org), available under the Open Database License (ODbL). Food data from USDA FoodData Central.',
    messages: {
      saved: 'Settings saved.',
      saveError: 'Unable to save settings.',
      floorOff: 'Calorie floor turned off. Your daily targets were recalculated.',
      floorOn: 'Recommended minimum turned on. Your daily targets were recalculated.',
      floorError: 'Unable to change the calorie floor.',
      waterError: 'Unable to change the water goal.',
      shareOff: 'Workouts no longer add to your daily allowance.',
      shareOn: "{percent}% of the calories from workouts you log now add to that day's allowance.",
      shareError: 'Unable to change workout calories.',
      resetError: 'Unable to reset the profile.'
    },
    garminSync: {
      added: { one: 'Added {count} workout from Garmin.', other: 'Added {count} workouts from Garmin.' },
      linked: { one: "Linked {count} to workout you'd already logged.", other: "Linked {count} to workouts you'd already logged." },
      none: 'No new workouts.',
      failed: 'Garmin sync failed.'
    }
  },
  /** Garmin sync status in Settings. */
  garmin: {
    justNow: 'just now',
    minutesAgo: '{count} min ago',
    hoursAgo: '{count} hr ago',
    daysAgo: { one: '{count} day ago', other: '{count} days ago' },
    checking: 'Checking…',
    notConnected: 'Not connected. Add a Garmin personal API key on the server to turn it on.',
    neverSynced: 'Never synced.',
    lastSynced: 'Last synced {ago}.',
    failed: 'Sync failed: {error} {when}',
    unknownError: 'unknown error',
    notYet: 'Not synced yet.'
  },
  /** Settings → Water reminders. */
  reminders: {
    loadError: 'Unable to load reminders.',
    genericError: 'Something went wrong.',
    permissionOff: 'Notifications are off for Relish. Turn them on in iPhone Settings → Notifications → Relish, then try again.',
    on: 'Reminders on: {times}.',
    /** Joins the reminder times: "10 AM and 3 PM". */
    and: ' and ',
    off: 'Reminders off on this phone.',
    testSent: 'Test sent: it should appear in a few seconds.',
    notConfigured: 'Reminders aren’t set up on the server yet.',
    needsHomeScreen: 'Notifications need Relish added to the Home Screen (Share → Add to Home Screen) and opened from there.',
    turnOff: 'Turn off water reminders',
    turnOn: '💧 Turn on water reminders',
    remindAt: 'Remind me at',
    timesA11y: 'Reminder times',
    inTimeZone: 'In your time zone. A reminder is skipped once you’ve reached the day’s water goal.',
    noTimes: 'No times picked: no reminders will be sent.',
    sendTest: 'Send a test notification',
    iosAsks: 'iOS asks once whether Relish may send notifications.'
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
  },
  trends: {
    title: 'Trends',
    /** The range tabs; the stored range ids stay 1W, 1M, 3M. */
    ranges: { '1W': '1W', '1M': '1M', '3M': '3M' },
    today: 'Today',
    yesterday: 'Yesterday',
    weight: 'Weight',
    trendRate: 'Trend {rate} {unit} a week',
    weighMore: 'Weigh in a few more days to see your weekly trend',
    toGoal: '{value} {unit} to goal',
    projection: 'Projection',
    projectAhead: { one: 'Project {count} month ahead', other: 'Project {count} months ahead' },
    atTrend: 'At your current trend: {weight} {unit} by {date}',
    goalReached: ' · goal reached',
    goalBy: ' · goal by {date}',
    goalNotAtRate: ' · goal not at this rate',
    weighWeek: 'Weigh in for about a week to see where your trend is heading',
    plannedGoalBy: ' · at your planned pace, goal by {date}',
    rates: '{trend} vs {pace} {unit} a week',
    onPace: 'On pace ({rates})',
    ahead: 'Ahead of pace ({rates})',
    behind: 'Behind pace ({rates})',
    drifting: 'Drifting {rate} {unit} a week (planned: steady)',
    calories: 'Calories',
    average: '{value} avg',
    calorieSummary: '{logged} of {total} days logged · allowance avg {allowance} · {onTarget} on target',
    calorieOver: ' · {count} over',
    nothingInRange: 'Nothing logged in this range yet.',
    macros: 'Macros',
    macrosHint: 'Each day’s bar is its target (bigger on workout days), filled with what you ate. Tap a day for its grams and %.',
    water: 'Water',
    waterA11y: 'Water: {detail}',
    history: 'History',
    calorieChart: {
      a11y: 'Calories eaten each day against the allowance',
      eaten: 'eaten',
      allowance: 'allowance',
      over: 'over'
    },
    weightChart: {
      empty: 'No weigh-ins in this range. Tap Weigh in to add today’s.',
      a11y: 'Weight trend, {count} weigh-ins',
      trend: '— trend',
      ifContinues: '  - - if it continues',
      plan: '  ··· plan',
      goal: '  - - goal',
      weighIns: '● weigh-ins'
    },
    macroChart: {
      detail: '{day} · {eaten} of {target} g · {percent}%',
      nothingLogged: 'nothing logged',
      dayNothing: '{day}: nothing logged',
      dayGrams: '{day}: {eaten} of {target} g'
    },
    day: {
      a11y: '{day}: {eaten} of {allowance} kcal',
      value: '{eaten} / {allowance} kcal',
      nothingLogged: 'Nothing logged',
      workouts: { one: '{count} workout · {kcal} kcal', other: '{count} workouts · {kcal} kcal' },
      workoutsTitle: 'Workouts',
      workoutRow: '{minutes} min · {kcal} kcal ›'
    }
  },
  mealPlan: {
    eyebrow: 'Meal plan',
    create: '✨ Create a meal plan',
    balance: 'Meal balance: {style} (change it in Profile).',
    styleMeals: '{style} ({count} meals a day)',
    custom: 'Custom ({count} meals a day)',
    hint: 'Tap a date card to switch the visible plan, then mark planned meals as eaten for that day.',
    showing: 'Showing {date} plan',
    todaySuffix: ' · Today',
    plannedMeals: { one: '{count} planned meal', other: '{count} planned meals' },
    emptyTitle: 'No meal plan saved yet',
    emptyHint: 'Save a weekly plan to populate the date cards here.',
    unscheduled: 'Unscheduled',
    planned: 'Planned'
  },
  /** Plan → Meals → Create a meal plan. */
  createPlan: {
    title: 'Create a meal plan',
    stepOf: 'Step {step} of 4',
    daysTitle: 'Plan for how many days?',
    daysCount: '{count} days',
    orWeekdays: 'Or choose days of the week:',
    mealsTitle: 'Plan which meals?',
    timeTitle: 'How much time do you have for cooking?',
    times: {
      very_little: { label: 'Very little', detail: 'Sheet-pan, one-pot, or no-cook; batch once' },
      some: { label: 'Some', detail: 'Simple meals in about 30 minutes' },
      enjoy: { label: 'I enjoy cooking', detail: 'Anything goes, up to about an hour' }
    },
    varietyTitle: 'Meal variety',
    varieties: {
      same: { label: 'Same meal every time', detail: 'One breakfast, one lunch, one dinner, repeated' },
      rotate: { label: '2–3 meals through the week', detail: 'A short rotation, easy to batch' },
      daily: { label: 'Different every day', detail: 'A new meal each day' }
    },
    letGusPlan: '✨ Let Gus plan',
    yourMeals: 'Your meals',
    rotationMeal: 'Rotation meal {step} of {total}',
    dayOf: 'Day {step} of {total}',
    checkToKeep: 'Check ☑ the meals to keep',
    planning: 'Gus is planning…',
    totals: '{calories} kcal · P {protein} · C {carbs} · F {fat}',
    askAgain: 'Ask Gus again',
    tryAgain: 'Try again for unchecked',
    reviewPlan: 'Review plan',
    yourPlan: 'Your plan',
    startDate: 'Start date',
    mealLine: '{meal}: {name} · {calories} kcal',
    replace: 'Replace this meal',
    keepPlanned: 'Keep planned',
    startOver: 'Start over',
    creating: 'Creating…',
    create: 'Create plan',
    created: 'Plan created ✓',
    summary: '{count} meals planned',
    replaced: ' · {count} replaced',
    kept: ' · {count} kept as they were',
    summaryEnd: '. They show on Today as Planned: tick ✓ Ate it to log one.',
    makeList: '🛒 Make a shopping list',
    errors: {
      create: 'Unable to create the plan.',
      saveList: 'Unable to save the shopping list.'
    }
  },
  /** Shopping list titles, saved with each new list. */
  shoppingTitle: {
    untitled: 'Shopping list',
    plan: 'Meal plan · {dates}'
  },
  workoutPlan: {
    eyebrow: 'Planned exercise',
    title: 'Plan a workout for the selected Home date',
    detail: 'Save a future or same-day training session so Home can show planned movement separately from completed tracker logs.',
    planningFor: 'Planning for {date}',
    editing: 'Editing planned session',
    cancelEdit: 'Cancel edit',
    presets: {
      weights: 'Weights',
      bike: 'Bike',
      run: 'Run',
      swim: 'Swim'
    },
    presetMeta: '{minutes} min · est. {calories} kcal',
    titlePlaceholder: 'Swim, walk, lift...',
    saving: 'Saving...',
    update: 'Update plan',
    plan: 'Plan exercise',
    minutesPlaceholder: 'Main set minutes',
    estimatedBurn: 'Estimated burn',
    addWarmup: 'Add warmup',
    removeWarmup: 'Remove warmup',
    addCooldown: 'Add cooldown',
    removeCooldown: 'Remove cooldown',
    warmupPlaceholder: 'Warmup minutes',
    cooldownPlaceholder: 'Cooldown minutes',
    minutes: 'Minutes',
    intensity: {
      Low: 'Low',
      Moderate: 'Moderate',
      High: 'High'
    },
    completed: 'Completed {time}',
    edit: 'Edit',
    deleting: 'Deleting...',
    delete: 'Delete',
    undo: 'Undo',
    complete: 'Complete',
    emptyTitle: 'No planned sessions yet',
    emptyHint: 'Add a workout above to populate Home with future planned exercise.'
  },
  mealPrep: {
    eyebrow: 'Meal prep',
    title: 'Prep the week in batches',
    detail: 'Track what to cook, portion, and assemble so the meal plan is realistic.',
    saving: 'Saving...',
    tapToCycle: 'Tap to cycle',
    categories: {
      Protein: 'Protein',
      Carb: 'Carb',
      Produce: 'Produce',
      Assembly: 'Assembly'
    },
    statuses: {
      queued: 'Queued',
      inProgress: 'In progress',
      done: 'Done'
    }
  },
  profile: {
    eyebrow: 'Profile',
    title: 'Your body and goals',
    detail:
      'Update your weight, body stats, and goal here; your daily targets recalculate when you save. Units, time zone, and your name are in Settings.',
    bodyAndGoal: 'Body and goal',
    currentWeightLb: 'Current weight, lb',
    heightFt: 'Height, ft',
    heightIn: 'Height, in',
    goal: 'Goal',
    focus: 'Focus',
    pace: 'Pace',
    targetWeightLb: 'Target weight, lb',
    activityLevel: 'Activity level',
    save: 'Save profile and recalculate targets',
    saving: 'Saving...',
    goalsEyebrow: 'Goals',
    targetTitle: 'Target management',
    targetDetail:
      'The profile form above now drives the active targets. Manual goal entries remain available below for temporary overrides or experiments.',
    activeTarget: 'Active target',
    latestBlock: 'Latest generated target block',
    calories: 'Calories',
    goalNumber: 'Goal {number}',
    chips: {
      protein: '{value}P',
      carbs: '{value}C',
      fat: '{value}F'
    },
    emptyTitle: 'No goals saved yet',
    emptyHint: 'Create a starting target block below to populate this list.',
    effectiveDate: 'Effective date',
    addGoal: 'Add goal',
    status: {
      saveFailed: 'Could not save profile settings',
      otherAllergy: 'Type the other food to avoid, or turn off Other.',
      invalid: 'Enter a valid age, height, weight, and optional target weight before saving.',
      saving: 'Saving profile and recalculating targets',
      saved: 'Profile and targets saved',
      saveError: 'Unable to save profile settings.',
      savingGoal: 'Saving new goal',
      goalSaved: 'Goal saved',
      goalFailed: 'Could not save goal',
      goalError: 'Unable to save goal.'
    }
  },
  /** Food bank → Foods. */
  foods: {
    title: 'Your foods',
    detail: 'Your food bank and favorites first; searching also finds USDA foods. ✕ removes a food from your bank.',
    placeholder: 'Search yogurt, oats, blueberries...',
    refresh: 'Refresh',
    unbranded: 'Unbranded',
    favorite: 'Favorite',
    searchMatch: 'Search match',
    base: 'Base {amount}',
    quantity: 'Qty {amount}',
    saving: 'Saving...',
    addToToday: 'Add {amount} to today',
    confirmRemove: 'Confirm removing {name}',
    removeFromBank: 'Remove {name} from your food bank',
    removeConfirm: 'Remove?',
    calories: 'Calories',
    macros: 'Macros',
    macroLine: '{protein}P / {carbs}C / {fat}F',
    cachedFavorite: 'Already cached in this session’s favorite foods.',
    tapHeart: 'Tap the heart to save this search result into favorites.'
  },
  /** Food bank → Recipes. */
  recipes: {
    eyebrow: 'Recipes',
    title: 'Recipe library and import review',
    detail:
      'Browse the full recipe catalog in alphabetical order, narrow it with fuzzy search, and open each recipe inline to review the details.',
    importReview: 'Import review',
    noImportTitle: 'No live recipe import selected',
    noImportDetail: 'Imported recipes will appear here after a real text, PDF, or image upload is submitted.',
    placeholder: 'Find oats, chicken, parfait...',
    fetching: 'Fetching recipes...',
    noMatchTitle: 'No recipe matches yet',
    noMatchDetail: 'Try another title or ingredient term to narrow the recipe list.',
    saving: 'Saving...',
    counts: '{steps} steps · {ingredients} ingredients · {assets} assets',
    servings: '{count} servings',
    loadingDetail: 'Loading recipe detail...',
    scale: 'Recipe scale',
    scaleHint: 'The fixed stops keep the serving preview readable while you step through the accordion.',
    scaledYield: 'Scaled yield',
    recipeCalories: 'Recipe calories',
    perServing: 'Per serving',
    steps: 'Steps',
    ingredients: 'Ingredients',
    assets: 'Assets',
    noAssets: 'No imported assets attached yet.',
    assetLinked: '{kind} asset linked',
    assetEmbedded: '{kind} asset embedded',
    importScale: 'Import and scale',
    importScaleDetail: 'Text, PDF, and image ingestion will appear here once the import composer is wired in.',
    noComposerTitle: 'No live import composer yet',
    noComposerDetail: 'Imported recipes will show up here after a real text, PDF, or image submission.'
  },
  /** Food bank → Build a meal. */
  buildMeal: {
    eyebrow: 'Meal builder',
    namePlaceholder: 'Untitled meal',
    detail: 'Adjust the draft ingredients, then snap the serving scale to a fixed stop for a fast mobile-friendly preview.',
    servings: 'Servings',
    localDraft: 'Local draft only until meal persistence lands on the backend contract.',
    scale: 'Meal scale',
    scaleHint: 'Fixed stops keep the preview predictable while you edit the draft.',
    reset: 'Reset draft',
    backendGated: 'Meal save is still backend-gated, so this stays as a live preview.',
    per100: '{id} · {kcal} kcal / 100g',
    scaledPreview: 'Scaled preview',
    gramsLine: '{grams} g · {id}',
    mealCalories: 'Meal calories',
    perServing: 'Per serving'
  },
  /** Food bank → Recent scans. */
  scans: {
    eyebrow: 'Ingestion',
    title: 'Camera food bank',
    intro: 'Scan a barcode, package front, or nutrition label, check what was read, and save it to your food bank.',
    pending: 'Pending',
    capture: 'Capture',
    captureWeb:
      'Tap Scan and point at a barcode, a package front, or the nutrition label. Barcodes read instantly; for the rest, hold still and it captures by itself.',
    captureNative: 'Open the camera once, scan the package front, then scan the nutrition label or skip it if the product does not show one.',
    lookingUpButton: 'Looking up barcode…',
    cameraScanner: 'Camera scanner',
    packageFront: 'Package front: {file}',
    nutritionLabel: 'Nutrition label: {file}',
    notScanned: 'not scanned yet',
    cameraReady: 'Camera ready for live scanning.',
    cameraGrant: 'Open the live scanner and grant camera access to capture the current frame.',
    openAgain: 'Open Camera Again',
    openScanner: 'Open Camera Scanner',
    candidates: 'Package match candidates',
    noBrand: 'No brand',
    noCandidates: 'No existing-food matches returned from the current package scan.',
    loadingRecent: 'Loading recent scans...',
    noRecent: 'No recent scans',
    noRecentDetail: 'New package or label scans will appear here for quick review.',
    scanCount: { one: '{count} scan', other: '{count} scans' },
    hide: 'Hide',
    show: 'Show',
    confidence: '{time} · {percent}% confidence',
    detected: 'Detected result',
    unnamed: 'Unnamed product',
    oneServing: '1 serving',
    servingCalories: '{serving} · {calories} cal',
    macroLine: 'Protein {protein}g · Carbs {carbs}g · Fat {fat}g · Fiber —',
    matched: 'Nutrition matched by name',
    noNutrition: 'No nutrition found',
    matchedNote: 'These numbers come from a similar product. Check them against the label.',
    nothingMatched: 'Nothing matched "{name}". Scan the nutrition label to read the numbers, or enter them with Edit.',
    otherMatches: 'Not right? Other matches:',
    readingLabel: 'Reading the label…',
    fields: {
      productName: 'Product name',
      brand: 'Brand',
      servingSize: 'Serving size',
      calories: 'Calories'
    },
    variantsNote: 'Saving keeps every variant: one food each.',
    needFields: 'Add a name, calories, protein, carbs, and fat to save. Tap Edit.',
    checkNumbers: 'Check the numbers. Edit if anything is off, then Save.',
    savedFood: 'Saved food',
    savedFoods: 'Saved foods',
    perServing: '{kcal} kcal per serving',
    discard: 'Discard',
    selectItem: 'Select a review item',
    selectItemDetail: 'The selected item will appear here for editing and save actions.',
    camera: {
      packageScan: 'Package scan',
      labelScan: 'Label scan',
      framePackage: 'Frame the package front',
      frameLabel: 'Frame the nutrition label',
      packageHint: 'Start with the front of the package. After this scan, the camera will advance to the nutrition label step.',
      labelHint: 'Now scan the nutrition label, or skip this step if the product does not show one.',
      scanning: 'Scanning...',
      scanPackage: 'Scan Package Front',
      scanLabel: 'Scan Nutrition Label',
      skipLabel: 'Skip Label'
    },
    status: {
      loading: 'Loading pending outputs',
      loadingDetail: 'Fetching the ingestion review queue.',
      signIn: 'Sign in to review ingestion outputs',
      signInDetail: 'Sign in to see your scans.',
      scans: 'Scans',
      none: 'No pending outputs right now.',
      pending: { one: '{count} pending output ready for review.', other: '{count} pending outputs ready for review.' },
      unavailable: 'Scans unavailable',
      unavailableDetail: 'The backend queue is unavailable right now.',
      queueError: 'Ingestion queue unavailable.',
      scanningPackage: 'Scanning package front',
      scanningPackageDetail: 'Creating a package-ingestion output from the provided image payload.',
      packageScanned: 'Package scanned',
      packageRead: 'Read "{name}". Check the nutrition below, or scan the nutrition label for exact numbers.',
      thePackage: 'the package',
      packageFailed: 'Package scan failed',
      packageFailedDetail: 'The package image could not be analyzed.',
      scanningLabel: 'Scanning nutrition label',
      scanningLabelDetail: 'Creating a label-ingestion output from the provided image payload.',
      labelScanned: 'Label scanned',
      labelReplaced: 'The label replaced the matched nutrition. Check it, then save.',
      checkThenSave: 'Check the numbers, then save.',
      labelFailed: 'Label scan failed',
      labelFailedDetail: 'The label image could not be analyzed.',
      accepting: 'Accepting output',
      rejecting: 'Rejecting output',
      savingDecision: 'Saving the review decision.',
      accepted: 'Output accepted',
      rejected: 'Output rejected',
      reviewFailed: 'Review action failed',
      reviewFailedDetail: 'The selected output could not be updated.',
      reviewError: 'Unable to update ingestion review.',
      saving: 'Saving',
      savingDetail: 'Saving to your food bank.',
      saved: 'Saved to your food bank',
      savedOne: '{name} is in your food bank.',
      savedMany: '{count} foods are in your food bank.',
      saveFailed: 'Save failed',
      saveFailedDetail: 'Check the numbers and try again.',
      savingItem: 'Saving food item',
      savingItemDetail: 'Persisting the accepted ingestion output into the food catalog.',
      foodSaved: 'Food saved',
      foodsSaved: 'Foods saved',
      catalogOne: '{name} is now available in the food catalog.',
      catalogMany: '{count} foods are now available in the food catalog.',
      foodSaveFailed: 'Food save failed',
      foodSaveFailedDetail: 'The accepted output could not be saved as a food item.',
      foodSaveError: 'Unable to save food item.',
      cameraPermission: 'Camera permission is required to scan packages and labels.',
      noImageData: 'Camera capture did not return image data.',
      packageCreated: 'Package scan created',
      packageCreatedDetail: 'Scan the nutrition label next, or skip if the product does not show one.',
      captureError: 'Unable to capture image from camera.',
      signInFirst: 'Sign in before scanning.',
      preparing: 'Preparing photo',
      preparingDetail: 'Shrinking the photo before upload.',
      photoUnusable: 'Photo not usable',
      photoUnusableDetail: 'Take the photo again.',
      photoError: 'This photo could not be prepared.',
      readingDetail: 'Working out what the picture shows and reading it.',
      scanFailed: 'Scan failed',
      scanFailedDetail: 'Try again, or take a full photo.',
      plate: 'That looks like a plate of food',
      plateDetail: 'To log a meal, use the camera button in the tab bar: it adds each item with its portion.',
      unreadable: "Couldn't read that",
      unreadableDetail: 'Hold the phone a little closer and steady, then scan again, or take a full photo.',
      labelRead: 'Nutrition label read',
      packageFrontRead: 'Package front read',
      lookingUp: 'Looking up barcode',
      lookingUpDetail: 'Checking {code} in your food bank and Open Food Facts.',
      inBank: 'Already in your food bank',
      inBankDetail: '{name} is saved. Find it in Foods to log it.',
      barcodeFound: 'Barcode found',
      barcodeFoundDetail: '{name} from {source}. Check the numbers, then save.',
      barcodeNotFound: 'Barcode not found',
      barcodeNotFoundDetail: "We couldn't find this barcode. Photograph the nutrition label instead.",
      barcodeFailed: 'Barcode lookup failed',
      barcodeFailedDetail: 'Try again, or photograph the nutrition label instead.',
      packageReady: 'Package scan ready',
      packageReadyDetail: 'Nutrition label skipped. Review the package result and save when ready.',
      added: 'Added to today',
      addedDetail: "{name} is in today's meals."
    }
  }
} as const;
