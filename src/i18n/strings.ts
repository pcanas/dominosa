import type { Difficulty } from '@/levels';

/** Every user-facing string. Spanish is the reference; other locales must match its shape. */
const es = {
  appName: 'Dominosa',
  homeSubtitle: 'Une cada pareja de números con una ficha. Cada ficha aparece una sola vez.',
  prototypeTag: 'Prototipo · hito 1',
  version: (version: string, build: string) => `Versión ${version} · ${build}`,
  levelNumber: (n: number) => `Nivel ${n}`,
  gridSize: (cols: number, rows: number) => `${cols}×${rows}`,
  bestTime: (time: string) => `Mejor: ${time}`,
  inProgress: (placed: number, total: number) => `En curso · ${placed}/${total}`,
  difficulty: {
    tutorial: 'Tutorial',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    expert: 'Experto',
  } satisfies Record<Difficulty, string>,
  status: {
    start: 'Desliza entre dos celdas para colocar una ficha. Mantén pulsado y desliza para un muro',
    wallMode: 'Modo muro: desliza entre dos celdas que no pueden ir juntas',
    progress: (placed: number, total: number) => `${placed} de ${total} fichas`,
    duplicates: 'Hay fichas repetidas',
    fullWithDuplicates: 'Tablero completo, pero hay fichas repetidas',
    solved: (time: string) => `¡Resuelto en ${time}!`,
  },
  actions: {
    back: 'Volver',
    undo: 'Deshacer',
    wall: 'Muro',
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
  },
  notFound: 'Este nivel no existe.',
  goHome: 'Ir al inicio',
};

export type Strings = typeof es;

const en: Strings = {
  appName: 'Dominosa',
  homeSubtitle: 'Cover every pair of numbers with a domino. Each domino appears exactly once.',
  prototypeTag: 'Prototype · milestone 1',
  version: (version, build) => `Version ${version} · ${build}`,
  levelNumber: (n) => `Level ${n}`,
  gridSize: (cols, rows) => `${cols}×${rows}`,
  bestTime: (time) => `Best: ${time}`,
  inProgress: (placed, total) => `In progress · ${placed}/${total}`,
  difficulty: { tutorial: 'Tutorial', easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' },
  status: {
    start: 'Swipe between two cells to place a domino. Press and hold, then swipe, for a wall',
    wallMode: 'Wall mode: swipe between two cells that cannot pair up',
    progress: (placed, total) => `${placed} of ${total} dominoes`,
    duplicates: 'Some dominoes are repeated',
    fullWithDuplicates: 'Board full, but some dominoes are repeated',
    solved: (time) => `Solved in ${time}!`,
  },
  actions: {
    back: 'Back',
    undo: 'Undo',
    wall: 'Wall',
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
  },
  notFound: 'This level does not exist.',
  goHome: 'Go home',
};

const fr: Strings = {
  appName: 'Dominosa',
  homeSubtitle: 'Couvrez chaque paire de nombres avec un domino. Chaque domino n’apparaît qu’une fois.',
  prototypeTag: 'Prototype · jalon 1',
  version: (version, build) => `Version ${version} · ${build}`,
  levelNumber: (n) => `Niveau ${n}`,
  gridSize: (cols, rows) => `${cols}×${rows}`,
  bestTime: (time) => `Record : ${time}`,
  inProgress: (placed, total) => `En cours · ${placed}/${total}`,
  difficulty: { tutorial: 'Tutoriel', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', expert: 'Expert' },
  status: {
    start: 'Glissez entre deux cases pour poser un domino. Maintenez puis glissez pour un mur',
    wallMode: 'Mode mur : glissez entre deux cases qui ne peuvent pas aller ensemble',
    progress: (placed, total) => `${placed} sur ${total} dominos`,
    duplicates: 'Certains dominos sont répétés',
    fullWithDuplicates: 'Grille pleine, mais certains dominos sont répétés',
    solved: (time) => `Résolu en ${time} !`,
  },
  actions: {
    back: 'Retour',
    undo: 'Annuler',
    wall: 'Mur',
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
