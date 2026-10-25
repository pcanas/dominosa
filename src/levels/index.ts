import easy from './packs/easy.json';
import expert from './packs/expert.json';
import hard from './packs/hard.json';
import intro from './packs/intro.json';
import medium from './packs/medium.json';
import { parsePack } from './parse';
import type { Difficulty, Level, LevelPackFile } from './types';

export * from './types';
export { parseLevel, parsePack } from './parse';

/** A pack as the app shows it: its levels in play order. */
export interface LevelPack {
  /** Permanent id; level ids are `<pack id>-<nn>`. */
  readonly id: string;
  readonly difficulty: Difficulty;
  readonly levels: readonly Level[];
}

/** Every pack bundled with the app, in play order. */
const PACK_FILES: readonly LevelPackFile[] = [intro, easy, medium, hard, expert] as LevelPackFile[];

export const PACKS: readonly LevelPack[] = PACK_FILES.map((file) => {
  const levels = parsePack(file);
  const difficulty = levels[0]?.difficulty;
  if (!difficulty) throw new SyntaxError(`Pack ${file.id} has no levels`);
  return { id: file.id, difficulty, levels };
});

/** Every level, in play order (pack by pack). */
export const LEVELS: readonly Level[] = PACKS.flatMap((pack) => pack.levels);

const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
const packsById = new Map(PACKS.map((pack) => [pack.id, pack]));

export function getLevel(id: string): Level | undefined {
  return levelsById.get(id);
}

export function getPack(id: string): LevelPack | undefined {
  return packsById.get(id);
}

/** The level after `id` in play order: the next one in its pack, then the first of the next pack. */
export function nextLevel(id: string): Level | undefined {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index >= 0 ? LEVELS[index + 1] : undefined;
}
