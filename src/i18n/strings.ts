import type { Difficulty } from '@/levels';

/** Every user-facing string. Spanish is the reference; other locales must match its shape. */
const es = {
  appName: 'Dominosa',
  homeSubtitle: 'Une cada pareja de números con una ficha. Cada ficha aparece una sola vez.',
  version: (version: string, build: string) => `Versión ${version} · ${build}`,
  levelNumber: (n: number) => `Nivel ${n}`,
  gridSize: (cols: number, rows: number) => `${cols}×${rows}`,
  bestTime: (time: string) => `Mejor: ${time}`,
  inProgress: (placed: number, total: number) => `En curso · ${placed}/${total}`,
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
  difficulty: {
    tutorial: 'Tutorial',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    expert: 'Experto',
  } satisfies Record<Difficulty, string>,
  status: {
    start: 'Desliza entre dos celdas para colocar una ficha. Toca una ficha o un muro para quitarlo',
    wallOnce: 'Desliza entre dos celdas que no pueden ir juntas. Doble toque en Muro para dejarlo fijo',
    wallLocked: 'Muro fijo: cada deslizamiento marca un muro. Toca Muro para salir',
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
  },
  a11y: {
    board: 'Tablero',
    cell: (row: number, col: number, pip: number) => `Fila ${row}, columna ${col}: ${pip}`,
    solvedLevel: 'Resuelto',
    inProgressLevel: 'En curso',
    wallLocked: 'Muro, fijo',
    pair: (lo: number, hi: number, placed: number) =>
      `${lo} y ${hi}, ${placed === 0 ? 'sin colocar' : placed === 1 ? 'colocado' : 'repetido'}`,
    clearPair: 'Dejar de resaltar',
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
  bestTime: (time) => `Best: ${time}`,
  inProgress: (placed, total) => `In progress · ${placed}/${total}`,
  packs: { intro: 'First steps', easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' },
  packSolved: (solved, total) => `${solved} of ${total} solved`,
  packInProgress: (n) => `${n} in progress`,
  tracker: {
    title: 'Pairs',
    placed: (placed, total) => `${placed} of ${total} placed`,
    hint: 'Tap a pair to see where it can go',
  },
  difficulty: { tutorial: 'Tutorial', easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' },
  status: {
    start: 'Swipe between two cells to place a domino. Tap a domino or a wall to remove it',
    wallOnce: 'Swipe between two cells that cannot pair up. Double-tap Wall to keep it on',
    wallLocked: 'Wall locked: every swipe draws a wall. Tap Wall to leave',
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
  },
  a11y: {
    board: 'Board',
    cell: (row, col, pip) => `Row ${row}, column ${col}: ${pip}`,
    solvedLevel: 'Solved',
    inProgressLevel: 'In progress',
    wallLocked: 'Wall, locked',
    pair: (lo, hi, placed) =>
      `${lo} and ${hi}, ${placed === 0 ? 'not placed' : placed === 1 ? 'placed' : 'repeated'}`,
    clearPair: 'Stop highlighting',
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
  bestTime: (time) => `Record : ${time}`,
  inProgress: (placed, total) => `En cours · ${placed}/${total}`,
  packs: { intro: 'Premiers pas', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', expert: 'Expert' },
  packSolved: (solved, total) => `${solved} sur ${total} résolus`,
  packInProgress: (n) => `${n} en cours`,
  tracker: {
    title: 'Paires',
    placed: (placed, total) => `${placed} sur ${total} posées`,
    hint: 'Touchez une paire pour voir où elle peut aller',
  },
  difficulty: { tutorial: 'Tutoriel', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', expert: 'Expert' },
  status: {
    start: 'Glissez entre deux cases pour poser un domino. Touchez un domino ou un mur pour l’enlever',
    wallOnce: 'Glissez entre deux cases qui ne vont pas ensemble. Double touche sur Mur pour le garder',
    wallLocked: 'Mur verrouillé : chaque glissement trace un mur. Touchez Mur pour sortir',
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
    reset: 'Recommencer',
    confirmReset: 'Sûr ?',
    next: 'Suivant',
    replay: 'Rejouer',
    levels: 'Niveaux',
  },
  a11y: {
    board: 'Grille',
    cell: (row, col, pip) => `Ligne ${row}, colonne ${col} : ${pip}`,
    solvedLevel: 'Résolu',
    inProgressLevel: 'En cours',
    wallLocked: 'Mur, verrouillé',
    pair: (lo, hi, placed) =>
      `${lo} et ${hi}, ${placed === 0 ? 'pas posée' : placed === 1 ? 'posée' : 'en double'}`,
    clearPair: 'Ne plus surligner',
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
