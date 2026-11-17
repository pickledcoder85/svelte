/**
 * Spanish strings (Colombian Spanish, addressing the user as "usted"). Typed by the English
 * dictionary, so a missing or extra key fails `npm run check`.
 */
import type { Dictionary } from './translate';

export const es: Dictionary = {
  common: {
    close: 'Cerrar',
    cancel: 'Cancelar',
    done: 'Listo',
    clear: 'Borrar',
    save: 'Guardar',
    saving: 'Guardando…',
    adding: 'Agregando…',
    add: 'Agregar',
    keep: 'Conservar',
    delete: 'Eliminar',
    deleteConfirm: '¿Eliminar?',
    skipConfirm: '¿Omitir?',
    loading: 'Cargando…',
    less: 'Menos',
    more: 'Más',
    scanAgain: 'Escanear de nuevo',
    takeFullPhoto: 'Tomar una foto completa',
    deleteItem: 'Eliminar {name}',
    confirmDeleteItem: 'Confirmar que desea eliminar {name}',
    skipItem: 'Omitir {name}',
    confirmSkipItem: 'Confirmar que desea omitir {name}',
    kcal: '{value} kcal',
    macrosGrams: 'P {protein} g · C {carbs} g · G {fat} g',
    macrosShort: 'P {protein} · C {carbs} · G {fat}',
    minutes: '{minutes} min'
  },
  nav: {
    tabs: {
      today: 'Hoy',
      trends: 'Tendencias',
      plan: 'Plan'
    },
    weighIn: 'Peso',
    scanToLog: 'Escanee un alimento para registrarlo',
    account: 'Cuenta: perfil y ajustes',
    sections: {
      mealPlan: 'Comidas',
      workoutPlan: 'Entrenamientos',
      foods: 'Alimentos',
      recipes: 'Recetas',
      buildMeal: 'Armar una comida',
      recentScans: 'Escaneos recientes'
    }
  },
  account: {
    title: 'Cuenta',
    profile: 'Perfil',
    profileDetail: 'Cuerpo, meta y objetivos',
    foodBank: 'Despensa',
    foodBankDetail: 'Sus alimentos, recetas y escaneos recientes',
    shoppingLists: 'Listas de mercado',
    shoppingListsDetail: 'Marque lo que va comprando',
    settings: 'Ajustes',
    settingsDetail: 'Apariencia, unidades, nutrición, cuenta',
    switchToPreview: 'Cambiar a vista previa',
    logOut: 'Cerrar sesión',
    changeEntryMode: 'Cambiar modo de entrada'
  },
  addFood: {
    titleToday: 'Agregar alimento a hoy',
    title: 'Agregar alimento',
    search: 'Buscar alimentos',
    searchDetail: 'Primero sus alimentos, luego USDA (p. ej. "manzana verde")',
    scan: 'Escanear',
    scanDetail: 'Código de barras, empaque o tabla nutricional',
    quickCalories: 'Calorías rápidas',
    quickCaloriesDetail: 'Solo un número, sin buscar',
    suggest: 'Sugerir una comida',
    suggestDetail: 'Gus elige una comida que encaje con lo que le queda'
  },
  day: {
    today: 'Hoy · {date}',
    yesterday: 'Ayer · {date}',
    tomorrow: 'Mañana · {date}',
    goToToday: '{label}. Ir a hoy',
    previous: 'Día anterior',
    next: 'Día siguiente',
    letters: 'DLMXJVS',
    addToToday: 'Agregar a hoy',
    addToDay: 'Agregar al {day}',
    addedToToday: '✓ Agregado a hoy',
    addedToDay: '✓ Agregado al {day}'
  },
  meals: {
    title: 'Comidas',
    addFood: 'Agregar un alimento',
    emptyTitle: 'Todavía no ha comido nada.',
    emptyHint: 'Toque + para buscar, escanear o agregar calorías rápidas.',
    planned: 'Planeado · {meal}',
    ateIt: '✓ Me lo comí',
    ateItem: 'Me comí {name}',
    amountInGrams: 'Cantidad de {name} en gramos',
    editAmount: '{name}, {grams} g. Toque para cambiar la cantidad',
    slots: {
      breakfast: 'Desayuno',
      lunch: 'Almuerzo',
      dinner: 'Cena',
      snack: 'Refrigerio',
      other: 'Otro'
    },
    blocks: {
      breakfast: 'Desayuno',
      morning_snack: 'Media mañana',
      lunch: 'Almuerzo',
      afternoon_snack: 'Onces',
      dinner: 'Cena'
    },
    addToToday: {
      breakfast: 'Agregar al desayuno de hoy',
      lunch: 'Agregar al almuerzo de hoy',
      dinner: 'Agregar a la cena de hoy',
      snack: 'Agregar al refrigerio de hoy'
    },
    addToDay: {
      breakfast: 'Agregar al desayuno del {day}',
      lunch: 'Agregar al almuerzo del {day}',
      dinner: 'Agregar a la cena del {day}',
      snack: 'Agregar al refrigerio del {day}'
    },
    addAllToToday: {
      breakfast: 'Agregar todo al desayuno de hoy',
      lunch: 'Agregar todo al almuerzo de hoy',
      dinner: 'Agregar todo a la cena de hoy',
      snack: 'Agregar todo al refrigerio de hoy'
    },
    addAllToDay: {
      breakfast: 'Agregar todo al desayuno del {day}',
      lunch: 'Agregar todo al almuerzo del {day}',
      dinner: 'Agregar todo a la cena del {day}',
      snack: 'Agregar todo al refrigerio del {day}'
    },
    mealPicker: 'Comida'
  },
  today: {
    finishSetup: 'Termine la configuración para ver sus calorías del día.',
    errors: {
      add: 'No se pudo registrar el alimento.',
      update: 'No se pudo actualizar este registro.',
      delete: 'No se pudo eliminar este registro.',
      signInToEdit: 'Inicie sesión de nuevo para editar este registro.',
      gramsAboveZero: 'Ingrese una cantidad en gramos mayor que 0.',
      logWater: 'No se pudo registrar el agua.',
      undo: 'No se pudo deshacer.'
    }
  },
  macros: {
    protein: 'Proteína',
    carbs: 'Carbohidratos',
    fat: 'Grasa',
    ringLabel: '{label}: {eaten} de {target} gramos',
    ringOver: ', {amount} de más',
    grams: '{grams} g',
    of: 'de {target}'
  },
  budget: {
    left: 'Le quedan {value} kcal',
    over: '{value} kcal de más',
    captionEaten: 'Consumido {value}',
    captionWorkouts: 'Entrenamientos +{value}',
    lines: {
      target: 'Objetivo',
      workoutsShare: 'Entrenamientos ({percent} %)',
      workoutsOff: 'Entrenamientos (desactivado)',
      allowance: 'Disponible',
      eaten: 'Consumido',
      remaining: 'Restante',
      over: 'De más'
    },
    bars: {
      bmr: 'En reposo (TMB)',
      activity: 'Actividad diaria',
      workouts: 'Entrenamientos (calorías activas)'
    },
    pace: {
      deficit: 'Su ritmo (déficit)',
      surplus: 'Su ritmo (superávit)',
      even: 'Su ritmo'
    },
    showBreakdown: '{headline}. Mostrar el detalle',
    hideBreakdown: '{headline}. Ocultar el detalle',
    hide: 'Ocultar ▴',
    breakdown: 'Detalle ▾',
    todaysBudget: 'Presupuesto de hoy',
    openHistory: 'Abrir el historial en Tendencias',
    keptNote:
      '{kept} kcal de entrenamiento no se suman a su presupuesto{share}, así que el déficit de hoy es un poco mayor que el de su objetivo. Cámbielo en Ajustes → Calorías de entrenamiento.',
    keptShare: ' (usted suma el {percent} %)',
    whereFrom: 'De dónde sale su objetivo',
    targetNote:
      'Su objetivo es lo que quema en reposo y con el movimiento de todos los días, más su ritmo. Los entrenamientos no están en el objetivo; se suman el día que los hace.'
  },
  water: {
    title: '💧 Agua',
    summary: '{glasses} de {goal} vasos · {volume}',
    progress: 'Agua: {percent} % de la meta de hoy',
    undoLast: 'Deshacer el último',
    undoLastA11y: 'Deshacer la última bebida',
    addGlass: '＋ Vaso',
    addGlassA11y: 'Agregar un vaso de agua',
    addGlassHint: 'Mantenga presionado para agregar una botella',
    addBottle: '＋ Botella',
    addBottleA11y: 'Agregar una botella de agua',
    today: 'Hoy',
    nothingLogged: 'nada registrado'
  },
  workouts: {
    title: 'Entrenamientos',
    add: 'Agregar un entrenamiento',
    emptyToday: 'No hay entrenamientos hoy.',
    emptyDay: 'No hay entrenamientos este día.',
    emptyHint: 'Los entrenamientos de Garmin aparecen aquí solos, o toque + para agregar uno.',
    planned: 'Planeado',
    markDone: 'Marcar {name} como hecho',
    done: '✓ Hecho',
    showDetail: '{name}: ver cómo se cuentan sus calorías',
    activities: {
      walk: 'Caminata',
      run: 'Carrera',
      bike: 'Bicicleta',
      swim: 'Natación',
      strength: 'Fuerza',
      other: 'Otro'
    },
    efforts: {
      easy: 'Suave',
      moderate: 'Moderado',
      hard: 'Intenso'
    },
    effortHints: {
      easy: 'puede conversar',
      moderate: 'respira más rápido',
      hard: 'casi no puede hablar'
    },
    duration: {
      minutes: '{minutes} min',
      hours: '{hours} h',
      hoursMinutes: '{hours} h {minutes} min'
    },
    sheet: {
      title: 'Agregar un entrenamiento',
      activity: 'Actividad',
      namePlaceholder: '¿Qué hizo? p. ej. Pickleball',
      nameA11y: 'Nombre del entrenamiento',
      howLong: 'Duración',
      durationA11y: 'Duración en minutos',
      effort: 'Esfuerzo',
      distance: 'Distancia (opcional, define el ritmo)',
      distanceMiles: 'Distancia en millas',
      distanceKm: 'Distancia en kilómetros',
      watchTotal: 'El total de su reloj',
      watchA11y: 'Calorías que marca su reloj',
      watchNote: 'Relish descuenta sus calorías en reposo de estos minutos (su objetivo ya las cuenta).',
      ownEstimate: ' Cálculo de Relish: ≈ {value} kcal activas.',
      useEstimate: 'Usar el cálculo de Relish',
      estimate: '≈ {value} kcal activas',
      estimating: 'Calculando…',
      fromPace: 'según su ritmo · MET {met}',
      fromEffort: '{activity}, esfuerzo {effort} · MET {met}',
      atWeight: ' · con {weight}',
      typicalWeight: ' · con un peso típico (registre su peso para un mejor cálculo)',
      myWatch: 'Mi reloj marca…',
      error: 'No se pudo agregar el entrenamiento.'
    },
    detail: {
      from: ' · de {source}',
      recorded: 'Lo que registró {source}',
      relishCounts: 'Lo que cuenta Relish',
      addedShare: 'Sumado a hoy ({percent} %)',
      addedOff: 'Sumado a hoy (desactivado)',
      estimatedByRelish: 'Calculado por Relish',
      fromPace: 'Según su ritmo',
      metPart: ', MET {met}',
      atWeight: ' con {weight}',
      estimateNote: '{basis}{met}{weight}.',
      metFormula:
        'Calorías activas = (MET − 1) × peso × horas: el 1 MET que quema en reposo se deja por fuera porque su objetivo ya lo cuenta.',
      watchSaid: 'Su reloj marcó',
      restingYourBmr: 'En reposo (su TMB)',
      activeCounted: 'Activas que se cuentan',
      watchNote:
        'El total de su reloj incluye las calorías que quemaría de todos modos en reposo; Relish descuenta su propio cálculo de reposo (la misma TMB de su objetivo) para no contarlas dos veces.',
      youLogged: 'Usted registró',
      loggedNote: 'Registrado en Relish. Su número se usa como calorías activas.',
      totalBurned: 'Total quemado',
      restingTheirs: 'En reposo (cálculo del reloj)',
      active: 'Activas',
      restingSource: 'En reposo (de {source}, hasta la configuración)',
      editedNote: 'Usted editó las calorías de este entrenamiento; se usa su número.',
      countsMore:
        'Relish cuenta {value} más que el número activo de {source} porque su cálculo de reposo es distinto del de ellos. Relish usa la misma TMB de su objetivo, así que las calorías en reposo nunca se cuentan dos veces.',
      countsLess:
        'Relish cuenta {value} menos que el número activo de {source} porque su cálculo de reposo es distinto del de ellos. Relish usa la misma TMB de su objetivo, así que las calorías en reposo nunca se cuentan dos veces.',
      shareOnly:
        'Solo el {percent} % de las calorías activas se suma a hoy porque los cálculos de los relojes tienden a quedar altos. Cámbielo en Ajustes → Calorías de entrenamiento.',
      shareNone:
        'Ninguna de las calorías activas se suma a hoy porque los cálculos de los relojes tienden a quedar altos. Cámbielo en Ajustes → Calorías de entrenamiento.',
      keptAsRecorded: 'Los números de {source} se guardan tal como se registraron. Los de Relish se calculan una vez, cuando llega el entrenamiento.'
    }
  },
  weighIn: {
    title: 'Registrar peso · hoy',
    kilograms: 'Kilogramos',
    pounds: 'Libras',
    tenths: 'Décimas',
    last: 'Último: {weight} {unit} {when}',
    whenToday: 'hoy',
    whenOn: 'el {date}',
    weekChange: '{change} {unit} en una semana',
    saved: 'Se guardó {weight} para hoy',
    saveFailed: 'No se pudo guardar: {message}',
    saveFailedGeneric: 'No se pudo guardar el peso'
  },
  foodSheet: {
    favorite: 'Favorito',
    per100: 'Nutrición por cada 100 g',
    serving: '1 porción = {serving}',
    fromBank: 'De su despensa',
    newOnSave: 'Nuevo: se guarda en su despensa cuando lo agregue o lo guarde',
    newSaved: 'Nuevo: guardado en su despensa',
    servings: 'Porciones',
    weight: 'Peso ({unit})',
    weightIn: 'Peso en {unit}',
    per100Hint: '¿Cuántos gramos usó? Revise el empaque para ver el peso de la porción.',
    enterWeight: 'Ingrese un peso.',
    saveOnly: 'Solo guardar en la despensa',
    addError: 'No se pudo agregar este alimento.',
    saveError: 'No se pudo guardar este alimento.'
  },
  quickCalories: {
    title: 'Calorías rápidas',
    calories: 'Calorías',
    namePlaceholder: '¿Qué era? (opcional)',
    name: 'Nombre',
    inUnit: '{label} en {unit}',
    error: 'No se pudo agregar.'
  },
  search: {
    title: 'Buscar alimentos',
    placeholder: 'Sus alimentos o USDA, p. ej. manzana verde',
    mostUsed: 'Sus alimentos, los más usados primero',
    nothingFound: 'No se encontró nada. Pruebe con menos palabras.',
    noSavedFoods: 'Aún no tiene alimentos guardados. Busque uno.',
    yourFood: 'Su alimento',
    error: 'La búsqueda falló.'
  },
  scan: {
    lookingUpBarcode: 'Buscando el código de barras…',
    reading: 'Leyendo…',
    barcodeNotFound:
      'No encontramos la nutrición de este producto. Escanee la tabla nutricional: se guardará con el código de barras para la próxima vez.',
    barcodeFailed: 'La búsqueda del código de barras falló.',
    failed: 'El escaneo falló.',
    unreadable: 'No se pudo leer.',
    numbersUnreadable: 'No se pudieron leer los números. Acerque un poco la tabla e intente de nuevo.',
    noName: 'La tabla no muestra el nombre del producto: puede cambiarlo en Alimentos.',
    thisProduct: 'este producto',
    noNutrition: 'No se encontró nutrición para {name}. Escanee su tabla nutricional para ver los números.',
    notSaved: 'No se pudo guardar el alimento.',
    searchAction: '🔎 Buscar',
    quickCaloriesAction: '✏️ Calorías rápidas',
    scanLabelForExact: 'Escanee la tabla nutricional para los números exactos',
    scanTheLabel: 'Escanee la tabla',
    notFound: 'No encontrado',
    scanNutritionLabel: 'Escanear la tabla nutricional',
    scanner: {
      title: 'Escanear',
      barcodeTitle: 'Escanear un código de barras',
      starting: 'Encendiendo la cámara…',
      holdLabel: 'Mantenga la tabla nutricional dentro del marco y quieta: se captura sola.',
      holdAnything:
        'Código de barras, empaque, tabla nutricional o un plato de comida. Manténgalo dentro del marco y quieto: se captura solo.',
      holdBarcode: 'Mantenga el código de barras dentro del recuadro. Se lee solo.',
      takePhotoInstead: 'Mejor tomar una foto',
      hints: {
        bringItIn: 'Ponga el empaque o la tabla dentro del marco',
        holdSteady: 'Manténgalo firme…',
        tooBlurry: 'Acérquese o aléjese un poco hasta que se vea nítido',
        nothingToRead: 'Apunte al empaque o a su tabla nutricional',
        holdStill: 'No lo mueva…'
      }
    },
    plate: {
      title: 'En su plato',
      intro: 'Las porciones se calculan a partir de la foto: ajústelas con − / + si no se ven bien.',
      usda: 'USDA: {name}',
      photoEstimate: 'Cálculo a partir de la foto (sin coincidencia en USDA)',
      remove: 'Quitar {name}',
      less: 'Menos {name}',
      more: 'Más {name}',
      nothingLeft: 'No queda nada por agregar.',
      total: 'Total',
      estimateNote: 'Lo que no coincide con USDA usa el cálculo de la foto y se registra como calorías rápidas.',
      addRest: 'Agregar el resto',
      estimateName: '{name} (cálculo, {grams} g)',
      error: 'No se pudieron agregar estos alimentos.',
      partial: 'Algunos se agregaron (marcados con ✓). El resto falló: {message}'
    }
  },
  suggest: {
    title: '✨ Gus sugiere',
    whichMeal: 'Qué comida',
    havePlaceholder: '¿Algo que quiera usar? (opcional) p. ej. pollo, arroz',
    haveA11y: 'Ingredientes que tiene',
    photo: 'Foto de mis ingredientes',
    photoDetail: 'Nevera, mesón o alacena',
    letGusChoose: 'Que Gus elija',
    letGusChooseDetail: 'Según lo que le queda hoy',
    thinking: 'Gus está pensando…',
    budget: '{block} · presupuesto: {calories} kcal · P {protein} · C {carbs} · G {fat}',
    leftToday: '(le quedan {calories} kcal hoy)',
    sees: 'Gus ve: {items}',
    leftOut: 'Por fuera (sin datos de nutrición): {items}',
    planned: 'Usted ya planeó “{title}” ({calories} kcal) para esta comida.',
    replacePlanned: 'Reemplazar lo planeado',
    keepPlanned: 'Conservar lo planeado',
    logIt: 'Registrar',
    stuck: 'Gus se enredó. Intente de nuevo.',
    partial: 'Una parte se agregó; toque Registrar otra vez para agregar el resto. ({message})',
    errorWord: 'error',
    logError: 'No se pudo registrar esta comida.',
    photoError: 'No se pudo usar esa foto.'
  },
  shopping: {
    title: '🛒 Listas de mercado',
    allLists: 'Todas las listas de mercado',
    lists: '‹ Listas',
    share: 'Compartir',
    notSavedYet: 'Aún sin guardar: se guarda cuando vuelva a tener conexión.',
    allDoneAsk: 'Todo listo 🎉 ¿Eliminar esta lista?',
    addPlaceholder: '＋ Agregar algo, p. ej. café',
    addA11y: 'Agregar un artículo',
    tapAgainToDelete: 'Toque otra vez para eliminar esta lista',
    deleteList: 'Eliminar lista',
    opening: 'Abriendo…',
    empty: 'Aún no hay listas de mercado. Cree un plan de comidas y luego toque “Hacer una lista de mercado”.',
    deleted: 'Lista eliminada.',
    copied: 'Copiado.',
    progress: {
      empty: 'Vacía',
      allDone: 'Todo listo',
      left: 'Faltan {remaining} de {total}'
    },
    shareAllDone: 'Todo listo.',
    roles: {
      protein: 'Proteínas',
      carb: 'Harinas y granos',
      veg: 'Verduras',
      fruit: 'Frutas',
      fat: 'Grasas y aceites',
      other: 'Otros'
    },
    errors: {
      load: 'No se pudieron cargar las listas de mercado.',
      open: 'No se pudo abrir la lista.',
      add: 'No se pudo agregar el artículo.',
      delete: 'No se pudo eliminar la lista.'
    }
  },
  settings: {
    language: {
      label: 'Idioma',
      english: 'English',
      spanish: 'Español',
      hint: 'Se guarda en su perfil y se aplica de inmediato.',
      error: 'No se pudo cambiar el idioma.'
    }
  }
};
