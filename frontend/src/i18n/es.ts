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
  },
  setup: {
    welcome: {
      title: '¡Le damos la bienvenida a Relish!',
      intro: 'Soy Gherkin. Configuremos sus metas de nutrición y actividad para que sus objetivos diarios se ajusten a usted.',
      sections: {
        aboutYou: { title: 'Sobre usted', detail: 'Estatura, peso, edad y actividad' },
        goal: { title: 'Su meta', detail: 'Bajar, mantener o subir de peso, y a qué ritmo' },
        eating: { title: 'Cómo come', detail: 'Dieta, estilo de nutrición y alergias' }
      },
      footnote: 'Toma unos 2 minutos. Puede cambiar cualquier cosa después en Perfil.',
      action: 'Empezar'
    },
    explainers: {
      activity: {
        title: 'Su día, no sus entrenamientos',
        intro: 'Ahora cuénteme cuánto se mueve en un día normal: caminar, oficios de la casa, diligencias y su trabajo.',
        workouts: 'No cuente los entrenamientos. Esos los registra en Tracker y se suman a lo que puede comer ese día.',
        baseline: 'Esto define su base: lo que gasta en un día común.',
        action: 'Entendido'
      },
      goal: {
        title: 'Su meta tiene que ver con la comida',
        intro: 'Su objetivo diario de calorías sale de su base y de su meta. Es lo que come para mantener el ritmo.',
        covers: 'Cubre su alimentación y su movimiento de todos los días.',
        workouts: 'Los entrenamientos que registre se suman a lo que puede comer en el día, así puede comer un poco más y mantener el ritmo.',
        action: 'Entendido'
      }
    },
    steps: {
      basics: 'Sobre usted',
      activity: 'Actividad',
      goal: 'Su meta',
      pace: 'Ritmo o enfoque',
      diet: 'Dieta',
      style: 'Estilo de nutrición',
      balance: 'Reparto de comidas',
      allergies: 'Alergias',
      review: 'Revisión'
    },
    progress: {
      label: 'Paso {step} de {total}: {name}',
      count: '{step} de {total}'
    },
    status: {
      saving: 'Guardando el perfil...',
      issue: 'Hay algo por corregir en la configuración'
    },
    nav: {
      back: 'Atrás',
      next: 'Siguiente',
      create: 'Crear perfil',
      saving: 'Guardando...'
    },
    kcalPerDay: '{value} kcal al día',
    weeklyRate: 'unos {value} {unit} por semana',
    approximateDate: {
      early: 'principios de {month} de {year}',
      mid: 'mediados de {month} de {year}',
      late: 'finales de {month} de {year}'
    },
    units: {
      years: 'años',
      ageValue: '{value} años',
      heightCm: 'Estatura, centímetros',
      heightFeet: 'Estatura, pies',
      heightInches: 'Estatura, pulgadas',
      kilograms: '{name}, kilogramos',
      pounds: '{name}, libras',
      ageYears: 'Edad, años'
    },
    body: {
      title: 'Sobre usted',
      intro: 'Con estos datos calculamos cuántas calorías usa su cuerpo cada día.',
      units: 'Unidades',
      name: 'Su nombre',
      namePlaceholder: '¿Cómo quiere que le diga?',
      sex: 'Sexo',
      male: 'Hombre',
      female: 'Mujer',
      height: 'Estatura',
      weight: 'Peso',
      age: 'Edad',
      goalWeight: 'Meta de peso',
      choose: 'Elegir',
      noGoalWeight: 'Sin meta de peso'
    },
    activity: {
      title: 'Actividad diaria',
      intro: 'Cuente el movimiento de todos los días, como caminar, los oficios de la casa y su trabajo. Los entrenamientos se registran aparte.',
      bmrLink: '¿Qué es la TMB?',
      hideBmr: 'Ocultar la información de la TMB',
      bmrExplainer:
        'La TMB (tasa metabólica basal) es la energía que su cuerpo necesita en reposo total: respirar, mantener la circulación, conservar el calor. Relish la calcula con su estatura, peso, edad y sexo usando la fórmula de Mifflin-St Jeor. Si le suma su actividad, eso es más o menos lo que gasta en un día, su mantenimiento: si come esa cantidad, su peso se mantiene.',
      atRest: 'En reposo (TMB)',
      withActivity: 'Con su actividad',
      fromActivity: '+{value} por actividad',
      sliderLabel: 'Nivel de actividad diaria',
      levelPosition: '{level}, {index} de {total}',
      captionLabel: '{level}, {index} de {total}. {description}, {steps}.',
      levels: {
        sedentary: { title: 'Sedentario', description: 'Casi todo el día sentado', steps: '< 5.000 pasos' },
        light: { title: 'Ligero', description: 'Camina un poco', steps: '5.000–7.500 pasos' },
        moderate: { title: 'Moderado', description: 'A menudo de pie', steps: '7.500–10.000 pasos' },
        very_active: { title: 'Muy activo', description: 'De pie la mayor parte del día', steps: '10.000–15.000 pasos' },
        extra_active: { title: 'Extra activo', description: 'Trabajo físico todo el día', steps: 'Más de 15.000 pasos' }
      }
    },
    goal: {
      title: 'Su meta',
      youBurn: 'Usted gasta unas {calories}.',
      about: 'Unas {calories}',
      options: {
        lose: { title: 'Bajar de peso', detail: 'Comer un poco menos de lo que gasta' },
        maintain: { title: 'Mantener el peso', detail: 'Comer más o menos lo que gasta' },
        gain: { title: 'Subir de peso', detail: 'Comer un poco más de lo que gasta' }
      }
    },
    pace: {
      titleFocus: 'Su enfoque',
      titleHowFast: '¿A qué ritmo?',
      introFocus: 'Las mismas calorías en cualquier caso. Su enfoque cambia cómo se reparten entre proteína, carbohidratos y grasa.',
      introPace: 'Un ritmo más lento es más fácil de sostener. Puede cambiarlo cuando quiera.',
      lose: 'Bajar {rate}',
      gain: 'Subir {rate}',
      below: 'Por debajo del mínimo recomendado de {minimum}',
      belowFloorOff: 'Por debajo del mínimo recomendado de {minimum} (mínimo desactivado)',
      usingMinimum: 'Calculado: {calculated} · se usa el mínimo recomendado',
      wrongDirection:
        'Con el mínimo de {minimum} no bajaría de peso, porque es más de lo que gasta. Muévase más para mantener este ritmo, o toque este ritmo para no usar el mínimo.',
      goalWeightOptional: 'Meta de peso (opcional)',
      estimate: {
        one: 'A este ritmo: más o menos {count} semana, hacia {date}.',
        other: 'A este ritmo: unas {count} semanas, hacia {date}.'
      },
      goalBelowCurrent: 'La meta de peso debe ser menor que su peso actual.',
      goalAboveCurrent: 'La meta de peso debe ser mayor que su peso actual.',
      options: {
        lose: {
          light: { title: 'Constante' },
          recommended: { title: 'Recomendado', note: 'El mejor equilibrio para la mayoría' },
          extreme: { title: 'Rápido', note: 'Más difícil de sostener' }
        },
        maintain: {
          steady: { title: 'Mantenerse estable', note: 'Proteína, carbohidratos y grasa equilibrados' },
          build_muscle: { title: 'Ganar músculo', note: 'Más proteína, para entrenamiento de fuerza' },
          fuel_training: { title: 'Rendir en el entrenamiento', note: 'Más carbohidratos, para entrenamiento de resistencia' }
        },
        gain: {
          lean: { title: 'Limpio', note: 'Lento y constante' },
          aggressive: { title: 'Más rápido', note: 'Más de lo que suba puede ser grasa' }
        }
      }
    },
    floor: {
      title: 'Por debajo del mínimo recomendado',
      useMinimum: 'Usar {value} kcal',
      recommended: 'Recomendado',
      keep: 'Conservar {value} kcal',
      optOut: 'No usar el mínimo',
      maintaining: 'Mantenimiento',
      thisPace: 'Este ritmo',
      recommendedMinimum: 'Mínimo recomendado',
      forMen: 'para hombres',
      forWomen: 'para mujeres',
      risk: 'Bajar más sin un médico hace difícil consumir suficiente proteína y nutrientes, y aumenta el riesgo de perder músculo, sentir fatiga y volver a subir de peso.',
      better: 'Mejor:',
      betterDetail: 'coma {minimum} kcal y queme las otras {extra} kcal moviéndose más, por ejemplo con una caminata diaria más larga.',
      veryLow: 'Menos de {limit} kcal al día es una dieta muy baja en calorías, que normalmente solo se hace con supervisión médica.',
      hint: 'Si no usa el mínimo, este se desactiva. Puede cambiarlo en Ajustes.'
    },
    diet: {
      title: 'Cómo come',
      intro: 'Le ayuda a Relish a sugerir alimentos y comidas que le sirvan. No cambia sus calorías.',
      options: {
        vegan: { title: 'Vegano', subtitle: 'Solo plantas' },
        vegetarian: { title: 'Vegetariano', subtitle: 'Sin carne ni pescado' },
        pescatarian: { title: 'Pescetariano', subtitle: 'Pescado, lácteos y plantas' },
        omnivore: { title: 'Omnívoro', subtitle: 'Dieta variada y equilibrada' },
        carnivore: { title: 'Carnívoro', subtitle: 'Basada en productos animales' }
      }
    },
    style: {
      title: 'Estilo de nutrición',
      intro: 'La forma de comer que prefiere. Puede cambiarla cuando quiera en Perfil.',
      options: {
        balanced: { title: 'Equilibrado', subtitle: 'Un enfoque variado y flexible' },
        high_protein: { title: 'Alto en proteína', subtitle: 'Proteína en cada comida, para la fuerza y conservar músculo' },
        low_carb: { title: 'Bajo en carbohidratos', subtitle: 'Menos carbohidratos: unos 50–130 g al día' },
        keto: { title: 'Keto', subtitle: 'Muy bajo en carbohidratos: menos de unos 50 g al día, más grasa' },
        mediterranean: { title: 'Mediterráneo', subtitle: 'Alimentos naturales, aceite de oliva, pescado, plantas' },
        paleo: { title: 'Paleo', subtitle: 'Carne, pescado, verduras, fruta y frutos secos; sin granos ni lácteos' }
      }
    },
    balance: {
      title: '¿Cómo reparte sus comidas?',
      intro:
        'Cómo se reparten las calorías del día entre el desayuno, el almuerzo y la cena. Gus lo usa para calcular el tamaño de las comidas que planea. Puede cambiarlo cuando quiera en Perfil.',
      defaultSuffix: ' (predeterminado)',
      split: 'Desayuno {breakfast} % · Almuerzo {lunch} % · Cena {dinner} %',
      styles: {
        balanced: { label: 'Equilibrado', detail: 'Más o menos lo mismo en cada comida' },
        'big-breakfast': { label: 'Desayuno grande', detail: 'Empezar el día con la comida más grande' },
        'big-lunch': { label: 'Almuerzo grande', detail: 'La comida principal a mitad del día' },
        'big-dinner': { label: 'Cena grande', detail: 'Más liviano de día, la comida principal en la noche' },
        'taper-down': { label: 'De más a menos', detail: 'Desayuno grande, cada vez más liviano hasta una cena ligera' },
        'build-up': { label: 'De menos a más', detail: 'Desayuno ligero, cada vez más hasta una cena grande' }
      }
    },
    allergies: {
      title: 'Alergias y alimentos que evita',
      intro: 'Elija todas las que apliquen, o Ninguna. Se guarda en su perfil.',
      other: 'Otra',
      otherPlaceholder: 'Por ejemplo, ajonjolí o soya',
      otherEntry: 'Otra: {text}',
      options: {
        none: { title: 'Ninguna', subtitle: 'Sin alergias alimentarias importantes' },
        milk: { title: 'Leche', subtitle: 'Evitar las proteínas de la leche' },
        egg: { title: 'Huevo', subtitle: 'Evitar el huevo y sus derivados' },
        peanut: { title: 'Maní', subtitle: 'Evitar el maní' },
        tree_nuts: { title: 'Frutos secos', subtitle: 'Evitar almendras, marañones, nueces' },
        wheat: { title: 'Trigo', subtitle: 'Evitar alimentos a base de trigo' },
        shellfish: { title: 'Mariscos', subtitle: 'Evitar camarón, cangrejo, langosta' },
        other: { title: 'Otra', subtitle: 'Agregar una restricción propia' }
      }
    },
    review: {
      title: '¡Todo se ve bien!',
      titleNamed: '¡Todo se ve bien, {name}!',
      intro: 'Revise todo y luego cree su perfil. Puede cambiar cualquier cosa después.',
      dailyTarget: 'Su objetivo diario',
      macros: 'Proteína {protein} g · Carbohidratos {carbs} g · Grasa {fat} g',
      floorOffBelow: 'Por debajo del mínimo recomendado (mínimo de calorías desactivado)',
      floorOffFuture: 'Mínimo de calorías desactivado: los objetivos futuros pueden quedar por debajo del mínimo recomendado',
      setToMinimum: 'Ajustado al mínimo recomendado',
      rows: {
        basics: 'Sobre usted',
        activity: 'Actividad diaria',
        goal: 'Meta',
        diet: 'Cómo come',
        style: 'Estilo de nutrición',
        balance: 'Reparto de comidas',
        allergies: 'Evitar'
      },
      goalWeight: 'meta {weight}',
      notChosen: 'Sin elegir',
      nothing: 'Nada',
      edit: 'Editar',
      editRow: 'Editar {label}'
    },
    errors: {
      chooseSex: 'Elija su sexo. Cambia el cálculo de sus calorías.',
      bodyMetric: 'Ingrese su estatura en cm y su peso en kg.',
      bodyImperial: 'Ingrese su estatura en pies y pulgadas (0-11) y su peso en lb.',
      age: 'Ingrese su edad.',
      goal: 'Elija una meta para continuar.',
      diet: 'Elija cómo come para continuar.',
      style: 'Elija un estilo de nutrición para continuar.',
      goalWeightNumber: 'Ingrese la meta de peso como un número, o déjela vacía.',
      goalWeightBelow: 'La meta de peso debe ser menor que su peso actual, o déjela vacía.',
      goalWeightAbove: 'La meta de peso debe ser mayor que su peso actual, o déjela vacía.',
      dietPattern: 'Elija un patrón de alimentación antes de continuar.',
      styleBefore: 'Elija un estilo de nutrición antes de continuar.',
      allergyOther: 'Agregue la alergia o restricción propia antes de continuar.',
      validBody: 'Ingrese una edad, estatura y peso válidos antes de continuar.',
      liveSession: 'Cree una sesión local en vivo antes de continuar a la app.',
      chooseAll: 'Elija su sexo, su meta, cómo come y su estilo de nutrición antes de crear su perfil.',
      complete: 'No se pudo completar la configuración.'
    }
  }
};
