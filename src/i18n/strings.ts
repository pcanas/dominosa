/** "a, b and c" with the language's own "and". */
const listWith =
  (and: string) =>
  (items: readonly string[]): string =>
    items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`;
const listEs = listWith('y');
const listEn = listWith('and');
const listFr = listWith('et');

/** A free neighbour of a cell, and the domino it would make, which is already on the board. */
export interface UsedNeighbour {
  readonly neighbour: number;
  readonly pair: string;
}

/** Every user-facing string. Spanish is the reference; other locales must match its shape. */
const es = {
  appName: 'Dominosa',
  homeSubtitle: 'Une cada pareja de números con una ficha. Cada ficha aparece una sola vez.',
  version: (version: string, build: string) => `Versión ${version} · ${build}`,
  levelNumber: (n: number) => `Nivel ${n}`,
  gridSize: (cols: number, rows: number) => `${cols}×${rows}`,
  packs: {
    intro: 'Primeros pasos',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    expert: 'Experto',
  } as Readonly<Record<string, string>>,
  packSolved: (solved: number, total: number) => `${solved} de ${total} resueltos`,
  packInProgress: (n: number) => `${n} en curso`,
  tracker: {
    title: 'Pares',
    placed: (placed: number, total: number) => `${placed} de ${total} colocados`,
    hint: 'Toca un par para ver dónde puede ir',
  },
  status: {
    start: 'Desliza entre dos celdas para colocar una ficha. Toca una ficha o un muro para quitarlo',
    wallOnce: 'Desliza entre dos celdas que no pueden ir juntas. Doble toque en Muro para dejarlo fijo',
    wallLocked: 'Muro fijo: cada deslizamiento marca un muro. Toca Muro para salir',
    /** With a screen reader, cells are picked one by one instead of swiped. */
    startPick:
      'Elige una celda y luego una vecina para colocar una ficha. Elige dos veces una ficha para quitarla',
    wallPick:
      'Muro: elige dos celdas vecinas que no pueden ir juntas, o dos con muro entre ellas para quitarlo',
    progress: (placed: number, total: number) => `${placed} de ${total} fichas`,
    duplicates: 'Hay fichas repetidas',
    fullWithDuplicates: 'Tablero completo, pero hay fichas repetidas',
    solved: (time: string) => `¡Resuelto en ${time}!`,
    pairOpen: (pair: string, n: number) =>
      n === 1 ? `${pair}: 1 hueco libre` : `${pair}: ${n} huecos libres`,
    pairPlaced: (pair: string) => `${pair} ya está en el tablero`,
    pairNone: (pair: string) => `${pair}: no le queda ningún hueco libre`,
  },
  actions: {
    back: 'Volver',
    undo: 'Deshacer',
    wall: 'Muro',
    pairs: 'Pares',
    close: 'Cerrar',
    reset: 'Reiniciar',
    confirmReset: '¿Seguro?',
    next: 'Siguiente',
    replay: 'Otra vez',
    levels: 'Niveles',
    settings: 'Ajustes',
    hint: 'Pista',
  },
  /** The hint sheet: three taps, "look here" → "why" → "do it" (or, for a mistake, "where" → "remove it"). */
  hint: {
    title: 'Pista',
    look: 'Mira las celdas marcadas',
    /** With a screen reader, the cells are named. */
    lookAt: (cells: string) => `Mira: ${cells}`,
    why: '¿Por qué?',
    doIt: 'Hazlo',
    mistake: 'Hay un error en el tablero',
    mistakes: (n: number) => `Hay ${n} errores en el tablero`,
    where: '¿Dónde?',
    wrongDomino: (pair: string) => `Esta ficha ${pair} no va aquí`,
    wrongWall: 'Este muro separa dos celdas que forman una ficha',
    removeDomino: 'Quítala',
    removeWall: 'Quítalo',
    reveal: (pair: string) => `Desde aquí no hay un paso sencillo: esta ficha ${pair} es de la solución`,
    cellSingle: (value: number, other: number) =>
      `Este ${value} solo puede ir con el ${other}: no le queda otra vecina libre`,
    /** Some of its other neighbours are free, but ruled out (`becauseUsed`, `becauseWalls`). */
    cellSingleBecause: (value: number, other: number, reasons: readonly string[]) =>
      `Este ${value} solo puede ir con el ${other}: ${listEs(reasons)}`,
    becauseUsed: ([first, ...rest]: readonly [UsedNeighbour, ...UsedNeighbour[]]) =>
      rest.length === 0
        ? `con el ${first.neighbour} sería la ficha ${first.pair}, que ya está puesta`
        : `${listEs([
            `con el ${first.neighbour} sería la ficha ${first.pair}`,
            ...rest.map((u) => `con el ${u.neighbour} la ${u.pair}`),
          ])}, que ya están puestas`,
    becauseWalls: (neighbours: readonly number[]) =>
      neighbours.length === 1
        ? `un muro lo separa del ${neighbours[0]}`
        : `unos muros lo separan ${listEs(neighbours.map((n) => `del ${n}`))}`,
    dominoSingle: (pair: string) => `La ficha ${pair} solo cabe aquí: es el último sitio que le queda`,
    sharedCell: (pair: string, value: number) =>
      `Todos los sitios que le quedan a la ficha ${pair} usan este ${value}, así que este ${value} no puede ir con nada más`,
    deadEndCell: (pair: string, value: number) =>
      `Si aquí fuera la ficha ${pair}, el ${value} de al lado se quedaría sin pareja: aquí va un muro`,
    deadEndDomino: (pair: string, other: string) =>
      `Si aquí fuera la ficha ${pair}, la ${other} ya no cabría en ningún sitio: aquí va un muro`,
    lookahead: (pair: string) =>
      `Si aquí fuera la ficha ${pair}, siguiendo las jugadas obligadas se llega a un callejón sin salida: aquí va un muro`,
  },
  settings: {
    title: 'Ajustes',
    game: 'Juego',
    sound: 'Sonido',
    vibration: 'Vibración',
    showTimer: 'Mostrar el tiempo mientras juegas',
    hints: 'Pistas',
    board: 'Tablero',
    numberStyle: 'Números o puntos',
    numberStyles: { digits: 'Números', pips: 'Puntos' },
    pipsNote: 'Los puntos llegan hasta el 6: los tableros de Difícil y Experto siguen con números.',
    theme: 'Tema',
    themes: { system: 'Sistema', light: 'Claro', dark: 'Oscuro' },
    language: 'Idioma',
    languageSystem: 'Sistema',
  },
  solved: {
    newBest: 'Nuevo récord',
    best: (time: string) => `Tu mejor tiempo: ${time}`,
    perfect: 'Sin pistas',
  },
  a11y: {
    cell: (row: number, col: number, pip: number) => `Fila ${row}, columna ${col}: ${pip}`,
    solvedLevel: 'Resuelto',
    perfectLevel: 'Resuelto sin pistas',
    inProgressLevel: 'En curso',
    wallOnce: 'Muro, para un muro',
    wallLocked: 'Muro, fijo',
    wallLock: 'Fijar',
    wallUnlock: 'Soltar',
    pair: (lo: number, hi: number, placed: number) =>
      `${lo} y ${hi}, ${placed === 0 ? 'sin colocar' : placed === 1 ? 'colocado' : 'repetido'}`,
    pairHighlighted: 'resaltado',
    clearPair: 'Dejar de resaltar',
    pairSpoken: (lo: number, hi: number) => `${lo} y ${hi}`,
    domino: (pair: string, towards: string) => `ficha ${pair} ${towards}`,
    duplicate: 'repetida',
    cellSelected: 'seleccionada',
    towards: {
      up: 'hacia arriba',
      down: 'hacia abajo',
      left: 'hacia la izquierda',
      right: 'hacia la derecha',
    },
    wallAt: {
      up: 'muro arriba',
      down: 'muro abajo',
      left: 'muro a la izquierda',
      right: 'muro a la derecha',
    },
    neighbour: {
      up: 'la de arriba',
      down: 'la de abajo',
      left: 'la de la izquierda',
      right: 'la de la derecha',
    },
    joinWith: (neighbour: string) => `Unir con ${neighbour}`,
    wallWith: (neighbour: string) => `Muro con ${neighbour}`,
    removeWallWith: (neighbour: string) => `Quitar el muro con ${neighbour}`,
    removeDomino: 'Quitar la ficha',
    timer: (time: string) => `Tiempo: ${time}`,
  },
  announce: {
    selected: (cell: string) => `Seleccionada. ${cell}. Elige una vecina`,
    deselected: 'Selección quitada',
    placed: (pair: string) => `Ficha ${pair} colocada`,
    placedDuplicate: (pair: string) => `Ficha ${pair} colocada. Está repetida`,
    removed: 'Ficha quitada',
    wallAdded: 'Muro puesto',
    wallsAdded: (n: number) => `${n} muros puestos`,
    wallRemoved: 'Muro quitado',
    blocked: 'Hay un muro entre esas celdas',
    undone: 'Deshecho',
    reset: 'Tablero vacío',
    wallLocked: 'Muro fijo',
    wallOff: 'Muro desactivado',
  },
  /** The guided tutorial on its own small board (see `src/game/tutorial.ts`). */
  tutorial: {
    title: 'Cómo se juega',
    skip: 'Saltar',
    stepOf: (step: number, total: number) => `Paso ${step} de ${total}`,
    place: 'Desliza entre las dos celdas marcadas para colocar una ficha',
    placePick: 'Elige una de las celdas marcadas y luego la otra para colocar una ficha',
    remove: (pair: string) =>
      `Cada ficha sale una sola vez, y esta ${pair} está repetida. Toca la marcada para quitarla`,
    removePick: (pair: string) =>
      `Cada ficha sale una sola vez, y esta ${pair} está repetida. Elige dos veces la marcada para quitarla`,
    wall: (pair: string) =>
      `Como la ${pair} ya está puesta, las celdas marcadas no pueden ir juntas. Toca Muro y desliza entre ellas. Un muro se quita tocándolo`,
    wallPick: (pair: string) =>
      `Como la ${pair} ya está puesta, las celdas marcadas no pueden ir juntas. Toca Muro y elígelas. Para quitar un muro, se hace igual`,
    hint: 'Si te atascas, toca Pista: te dice dónde mirar, por qué, y si quieres lo hace por ti',
    finish: 'Ahora tú: termina el tablero. Cada ficha, una sola vez',
    good: '¡Bien!',
    done: '¡Ya sabes jugar!',
    play: '¡Vamos a jugar!',
    back: 'Volver al inicio',
    nudgePlace: 'Prueba con las dos celdas marcadas',
    nudgeRemove: 'Toca la ficha marcada para quitarla',
    nudgeWall: 'Primero toca Muro y luego desliza entre las celdas marcadas',
    nudgeWallPick: 'Primero toca Muro y luego elige las celdas marcadas',
    nudgeHint: 'Toca Pista, abajo',
  },
  help: {
    howToPlay: 'Cómo se juega',
  },
  /** The first screen after installing the app, before the tutorial. */
  welcome: {
    tagline: 'Puzles de lógica con fichas de dominó',
    learn: 'Aprende a jugar',
    known: 'Ya sé jugar',
  },
  notFound: 'Este nivel no existe.',
  goHome: 'Ir al inicio',
};

export type Strings = typeof es;

const en: Strings = {
  appName: 'Dominosa',
  homeSubtitle: 'Cover every pair of numbers with a domino. Each domino appears exactly once.',
  version: (version, build) => `Version ${version} · ${build}`,
  levelNumber: (n) => `Level ${n}`,
  gridSize: (cols, rows) => `${cols}×${rows}`,
  packs: { intro: 'First steps', easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' },
  packSolved: (solved, total) => `${solved} of ${total} solved`,
  packInProgress: (n) => `${n} in progress`,
  tracker: {
    title: 'Pairs',
    placed: (placed, total) => `${placed} of ${total} placed`,
    hint: 'Tap a pair to see where it can go',
  },
  status: {
    start: 'Swipe between two cells to place a domino. Tap a domino or a wall to remove it',
    wallOnce: 'Swipe between two cells that cannot pair up. Double-tap Wall to keep it on',
    wallLocked: 'Wall locked: every swipe draws a wall. Tap Wall to leave',
    startPick: 'Pick a cell, then a neighbour, to place a domino. Pick a domino twice to remove it',
    wallPick:
      'Wall: pick two neighbouring cells that cannot pair up, or two with a wall between them to remove it',
    progress: (placed, total) => `${placed} of ${total} dominoes`,
    duplicates: 'Some dominoes are repeated',
    fullWithDuplicates: 'Board full, but some dominoes are repeated',
    solved: (time) => `Solved in ${time}!`,
    pairOpen: (pair, n) => (n === 1 ? `${pair}: 1 free spot` : `${pair}: ${n} free spots`),
    pairPlaced: (pair) => `${pair} is already on the board`,
    pairNone: (pair) => `${pair}: no free spot left`,
  },
  actions: {
    back: 'Back',
    undo: 'Undo',
    wall: 'Wall',
    pairs: 'Pairs',
    close: 'Close',
    reset: 'Reset',
    confirmReset: 'Sure?',
    next: 'Next',
    replay: 'Replay',
    levels: 'Levels',
    settings: 'Settings',
    hint: 'Hint',
  },
  hint: {
    title: 'Hint',
    look: 'Look at the marked cells',
    lookAt: (cells) => `Look at: ${cells}`,
    why: 'Why?',
    doIt: 'Do it',
    mistake: 'There is a mistake on the board',
    mistakes: (n) => `There are ${n} mistakes on the board`,
    where: 'Where?',
    wrongDomino: (pair) => `This ${pair} domino does not go here`,
    wrongWall: 'This wall splits two cells that form a domino',
    removeDomino: 'Remove it',
    removeWall: 'Remove it',
    reveal: (pair) => `There is no simple step from here: this ${pair} domino is part of the solution`,
    cellSingle: (value, other) =>
      `This ${value} can only go with the ${other}: it has no other free neighbour`,
    cellSingleBecause: (value, other, reasons) =>
      `This ${value} can only go with the ${other}: ${listEn(reasons)}`,
    becauseUsed: ([first, ...rest]) =>
      rest.length === 0
        ? `with the ${first.neighbour} it would be the ${first.pair}, which is already placed`
        : `${listEn([
            `with the ${first.neighbour} it would be the ${first.pair}`,
            ...rest.map((u) => `with the ${u.neighbour} the ${u.pair}`),
          ])}, which are already placed`,
    becauseWalls: (neighbours) =>
      neighbours.length === 1
        ? `a wall separates it from the ${neighbours[0]}`
        : `walls separate it from ${listEn(neighbours.map((n) => `the ${n}`))}`,
    dominoSingle: (pair) => `The ${pair} only fits here: it is the last place left for it`,
    sharedCell: (pair, value) =>
      `Every place left for the ${pair} uses this ${value}, so this ${value} cannot pair with anything else`,
    deadEndCell: (pair, value) =>
      `If the ${pair} went here, the ${value} next to it would be left without a partner: so, a wall`,
    deadEndDomino: (pair, other) =>
      `If the ${pair} went here, the ${other} would have nowhere left to go: so, a wall`,
    lookahead: (pair) =>
      `If the ${pair} went here, following the forced moves leads to a dead end: so, a wall`,
  },
  settings: {
    title: 'Settings',
    game: 'Game',
    sound: 'Sound',
    vibration: 'Vibration',
    showTimer: 'Show the time while playing',
    hints: 'Hints',
    board: 'Board',
    numberStyle: 'Numbers or dots',
    numberStyles: { digits: 'Numbers', pips: 'Dots' },
    pipsNote: 'Dots go up to 6: Hard and Expert boards keep numbers.',
    theme: 'Theme',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    language: 'Language',
    languageSystem: 'System',
  },
  solved: {
    newBest: 'New best time',
    best: (time) => `Your best: ${time}`,
    perfect: 'No hints',
  },
  a11y: {
    cell: (row, col, pip) => `Row ${row}, column ${col}: ${pip}`,
    solvedLevel: 'Solved',
    perfectLevel: 'Solved without hints',
    inProgressLevel: 'In progress',
    wallOnce: 'Wall, for one wall',
    wallLocked: 'Wall, locked',
    wallLock: 'Lock',
    wallUnlock: 'Unlock',
    pair: (lo, hi, placed) =>
      `${lo} and ${hi}, ${placed === 0 ? 'not placed' : placed === 1 ? 'placed' : 'repeated'}`,
    pairHighlighted: 'highlighted',
    clearPair: 'Stop highlighting',
    pairSpoken: (lo, hi) => `${lo} and ${hi}`,
    domino: (pair, towards) => `domino ${pair} ${towards}`,
    duplicate: 'repeated',
    cellSelected: 'selected',
    towards: { up: 'going up', down: 'going down', left: 'going left', right: 'going right' },
    wallAt: { up: 'wall above', down: 'wall below', left: 'wall on the left', right: 'wall on the right' },
    neighbour: {
      up: 'the cell above',
      down: 'the cell below',
      left: 'the cell on the left',
      right: 'the cell on the right',
    },
    joinWith: (neighbour) => `Join with ${neighbour}`,
    wallWith: (neighbour) => `Wall with ${neighbour}`,
    removeWallWith: (neighbour) => `Remove the wall with ${neighbour}`,
    removeDomino: 'Remove the domino',
    timer: (time) => `Time: ${time}`,
  },
  announce: {
    selected: (cell) => `Selected. ${cell}. Pick a neighbour`,
    deselected: 'Selection cleared',
    placed: (pair) => `Domino ${pair} placed`,
    placedDuplicate: (pair) => `Domino ${pair} placed. It is repeated`,
    removed: 'Domino removed',
    wallAdded: 'Wall drawn',
    wallsAdded: (n) => `${n} walls drawn`,
    wallRemoved: 'Wall removed',
    blocked: 'There is a wall between those cells',
    undone: 'Undone',
    reset: 'Board cleared',
    wallLocked: 'Wall locked',
    wallOff: 'Wall off',
  },
  tutorial: {
    title: 'How to play',
    skip: 'Skip',
    stepOf: (step, total) => `Step ${step} of ${total}`,
    place: 'Swipe between the two marked cells to place a domino',
    placePick: 'Pick one of the marked cells, then the other, to place a domino',
    remove: (pair) =>
      `Each domino appears only once, and this ${pair} is repeated. Tap the marked one to remove it`,
    removePick: (pair) =>
      `Each domino appears only once, and this ${pair} is repeated. Pick the marked one twice to remove it`,
    wall: (pair) =>
      `The ${pair} is already placed, so the marked cells cannot pair up. Tap Wall and swipe between them. Tap a wall to remove it`,
    wallPick: (pair) =>
      `The ${pair} is already placed, so the marked cells cannot pair up. Tap Wall and pick them. To remove a wall, do the same again`,
    hint: 'If you get stuck, tap Hint: it tells you where to look, why, and can make the move for you',
    finish: 'Your turn: finish the board. Each domino, just once',
    good: 'Nice!',
    done: 'You know how to play!',
    play: 'Let’s play!',
    back: 'Back to home',
    nudgePlace: 'Try the two marked cells',
    nudgeRemove: 'Tap the marked domino to remove it',
    nudgeWall: 'Tap Wall first, then swipe between the marked cells',
    nudgeWallPick: 'Tap Wall first, then pick the marked cells',
    nudgeHint: 'Tap Hint, below',
  },
  help: {
    howToPlay: 'How to play',
  },
  welcome: {
    tagline: 'Logic puzzles with dominoes',
    learn: 'Learn to play',
    known: 'I already know how to play',
  },
  notFound: 'This level does not exist.',
  goHome: 'Go home',
};

const fr: Strings = {
  appName: 'Dominosa',
  homeSubtitle: 'Couvrez chaque paire de nombres avec un domino. Chaque domino n’apparaît qu’une fois.',
  version: (version, build) => `Version ${version} · ${build}`,
  levelNumber: (n) => `Niveau ${n}`,
  gridSize: (cols, rows) => `${cols}×${rows}`,
  packs: { intro: 'Premiers pas', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', expert: 'Expert' },
  packSolved: (solved, total) => `${solved} sur ${total} résolus`,
  packInProgress: (n) => `${n} en cours`,
  tracker: {
    title: 'Paires',
    placed: (placed, total) => `${placed} sur ${total} posées`,
    hint: 'Touchez une paire pour voir où elle peut aller',
  },
  status: {
    start: 'Glissez entre deux cases pour poser un domino. Touchez un domino ou un mur pour l’enlever',
    wallOnce: 'Glissez entre deux cases qui ne vont pas ensemble. Double touche sur Mur pour le garder',
    wallLocked: 'Mur verrouillé : chaque glissement trace un mur. Touchez Mur pour sortir',
    startPick:
      'Choisissez une case puis une voisine pour poser un domino. Choisissez deux fois un domino pour l’enlever',
    wallPick:
      'Mur : choisissez deux cases voisines qui ne vont pas ensemble, ou deux séparées par un mur pour l’enlever',
    progress: (placed, total) => `${placed} sur ${total} dominos`,
    duplicates: 'Certains dominos sont répétés',
    fullWithDuplicates: 'Grille pleine, mais certains dominos sont répétés',
    solved: (time) => `Résolu en ${time} !`,
    pairOpen: (pair, n) => (n === 1 ? `${pair} : 1 place libre` : `${pair} : ${n} places libres`),
    pairPlaced: (pair) => `${pair} est déjà sur la grille`,
    pairNone: (pair) => `${pair} : plus aucune place libre`,
  },
  actions: {
    back: 'Retour',
    undo: 'Annuler',
    wall: 'Mur',
    pairs: 'Paires',
    close: 'Fermer',
    reset: 'Effacer',
    confirmReset: 'Sûr ?',
    next: 'Suivant',
    replay: 'Rejouer',
    levels: 'Niveaux',
    settings: 'Réglages',
    hint: 'Indice',
  },
  hint: {
    title: 'Indice',
    look: 'Regardez les cases marquées',
    lookAt: (cells) => `Regardez : ${cells}`,
    why: 'Pourquoi ?',
    doIt: 'Faites-le',
    mistake: 'Il y a une erreur sur la grille',
    mistakes: (n) => `Il y a ${n} erreurs sur la grille`,
    where: 'Où ?',
    wrongDomino: (pair) => `Ce domino ${pair} ne va pas ici`,
    wrongWall: 'Ce mur sépare deux cases qui forment un domino',
    removeDomino: 'Enlevez-le',
    removeWall: 'Enlevez-le',
    reveal: (pair) => `Pas d’étape simple d’ici : ce domino ${pair} fait partie de la solution`,
    cellSingle: (value, other) =>
      `Ce ${value} ne peut aller qu’avec le ${other} : il n’a pas d’autre voisine libre`,
    cellSingleBecause: (value, other, reasons) =>
      `Ce ${value} ne peut aller qu’avec le ${other} : ${listFr(reasons)}`,
    becauseUsed: ([first, ...rest]) =>
      rest.length === 0
        ? `avec le ${first.neighbour}, ce serait le ${first.pair}, déjà posé`
        : `${listFr([
            `avec le ${first.neighbour}, ce serait le ${first.pair}`,
            ...rest.map((u) => `avec le ${u.neighbour} le ${u.pair}`),
          ])}, déjà posés`,
    becauseWalls: (neighbours) =>
      neighbours.length === 1
        ? `un mur le sépare du ${neighbours[0]}`
        : `des murs le séparent ${listFr(neighbours.map((n) => `du ${n}`))}`,
    dominoSingle: (pair) => `Le ${pair} ne rentre qu’ici : c’est la dernière place qui lui reste`,
    sharedCell: (pair, value) =>
      `Toutes les places qui restent au ${pair} utilisent ce ${value}, donc ce ${value} ne peut aller avec rien d’autre`,
    deadEndCell: (pair, value) =>
      `Si le ${pair} allait ici, le ${value} d’à côté resterait sans partenaire : donc, un mur`,
    deadEndDomino: (pair, other) =>
      `Si le ${pair} allait ici, le ${other} n’aurait plus aucune place : donc, un mur`,
    lookahead: (pair) => `Si le ${pair} allait ici, les coups forcés mènent à une impasse : donc, un mur`,
  },
  settings: {
    title: 'Réglages',
    game: 'Jeu',
    sound: 'Son',
    vibration: 'Vibration',
    showTimer: 'Afficher le temps pendant la partie',
    hints: 'Indices',
    board: 'Grille',
    numberStyle: 'Chiffres ou points',
    numberStyles: { digits: 'Chiffres', pips: 'Points' },
    pipsNote: 'Les points vont jusqu’à 6 : les grilles Difficile et Expert gardent les chiffres.',
    theme: 'Thème',
    themes: { system: 'Système', light: 'Clair', dark: 'Sombre' },
    language: 'Langue',
    languageSystem: 'Système',
  },
  solved: {
    newBest: 'Nouveau record',
    best: (time) => `Votre meilleur temps : ${time}`,
    perfect: 'Sans indice',
  },
  a11y: {
    cell: (row, col, pip) => `Ligne ${row}, colonne ${col} : ${pip}`,
    solvedLevel: 'Résolu',
    perfectLevel: 'Résolu sans indice',
    inProgressLevel: 'En cours',
    wallOnce: 'Mur, pour un mur',
    wallLocked: 'Mur, verrouillé',
    wallLock: 'Verrouiller',
    wallUnlock: 'Déverrouiller',
    pair: (lo, hi, placed) =>
      `${lo} et ${hi}, ${placed === 0 ? 'pas posée' : placed === 1 ? 'posée' : 'en double'}`,
    pairHighlighted: 'surlignée',
    clearPair: 'Ne plus surligner',
    pairSpoken: (lo, hi) => `${lo} et ${hi}`,
    domino: (pair, towards) => `domino ${pair} ${towards}`,
    duplicate: 'en double',
    cellSelected: 'sélectionnée',
    towards: { up: 'vers le haut', down: 'vers le bas', left: 'vers la gauche', right: 'vers la droite' },
    wallAt: { up: 'mur en haut', down: 'mur en bas', left: 'mur à gauche', right: 'mur à droite' },
    neighbour: {
      up: 'la case du haut',
      down: 'la case du bas',
      left: 'la case de gauche',
      right: 'la case de droite',
    },
    joinWith: (neighbour) => `Unir avec ${neighbour}`,
    wallWith: (neighbour) => `Mur avec ${neighbour}`,
    removeWallWith: (neighbour) => `Enlever le mur avec ${neighbour}`,
    removeDomino: 'Enlever le domino',
    timer: (time) => `Temps : ${time}`,
  },
  announce: {
    selected: (cell) => `Sélectionnée. ${cell}. Choisissez une voisine`,
    deselected: 'Sélection annulée',
    placed: (pair) => `Domino ${pair} posé`,
    placedDuplicate: (pair) => `Domino ${pair} posé. Il est en double`,
    removed: 'Domino enlevé',
    wallAdded: 'Mur tracé',
    wallsAdded: (n) => `${n} murs tracés`,
    wallRemoved: 'Mur enlevé',
    blocked: 'Il y a un mur entre ces cases',
    undone: 'Annulé',
    reset: 'Grille vide',
    wallLocked: 'Mur verrouillé',
    wallOff: 'Mur désactivé',
  },
  tutorial: {
    title: 'Comment jouer',
    skip: 'Passer',
    stepOf: (step, total) => `Étape ${step} sur ${total}`,
    place: 'Glissez entre les deux cases marquées pour poser un domino',
    placePick: 'Choisissez une des cases marquées, puis l’autre, pour poser un domino',
    remove: (pair) =>
      `Chaque domino n’apparaît qu’une fois, et ce ${pair} est en double. Touchez celui qui est marqué pour l’enlever`,
    removePick: (pair) =>
      `Chaque domino n’apparaît qu’une fois, et ce ${pair} est en double. Choisissez deux fois celui qui est marqué pour l’enlever`,
    wall: (pair) =>
      `Le ${pair} est déjà posé, donc les cases marquées ne vont pas ensemble. Touchez Mur et glissez entre elles. Touchez un mur pour l’enlever`,
    wallPick: (pair) =>
      `Le ${pair} est déjà posé, donc les cases marquées ne vont pas ensemble. Touchez Mur et choisissez-les. Pour enlever un mur, refaites la même chose`,
    hint: 'Si vous bloquez, touchez Indice : il vous dit où regarder, pourquoi, et peut jouer le coup pour vous',
    finish: 'À vous : terminez la grille. Chaque domino, une seule fois',
    good: 'Bien !',
    done: 'Vous savez jouer !',
    play: 'C’est parti !',
    back: 'Retour à l’accueil',
    nudgePlace: 'Essayez avec les deux cases marquées',
    nudgeRemove: 'Touchez le domino marqué pour l’enlever',
    nudgeWall: 'Touchez d’abord Mur, puis glissez entre les cases marquées',
    nudgeWallPick: 'Touchez d’abord Mur, puis choisissez les cases marquées',
    nudgeHint: 'Touchez Indice, en bas',
  },
  help: {
    howToPlay: 'Comment jouer',
  },
  welcome: {
    tagline: 'Des puzzles de logique avec des dominos',
    learn: 'Apprendre à jouer',
    known: 'Je sais déjà jouer',
  },
  notFound: 'Ce niveau n’existe pas.',
  goHome: 'Accueil',
};

export const STRINGS = { es, en, fr } as const;
export type Locale = keyof typeof STRINGS;
export const DEFAULT_LOCALE: Locale = 'es';

export function isLocale(value: string | null | undefined): value is Locale {
  return value != null && value in STRINGS;
}
