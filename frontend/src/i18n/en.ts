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
    addBottleA11y: 'Add a bottle of water'
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
  }
} as const;
