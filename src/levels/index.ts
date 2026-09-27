import hito0 from './packs/hito0.json';
import { parsePack } from './parse';
import type { Level, LevelPackFile } from './types';

export * from './types';
export { parseLevel, parsePack } from './parse';

/** Every pack bundled with the app, in play order. */
const PACK_FILES: readonly LevelPackFile[] = [hito0 as LevelPackFile];

export const LEVELS: readonly Level[] = PACK_FILES.flatMap(parsePack);

const byId = new Map(LEVELS.map((level) => [level.id, level]));

export function getLevel(id: string): Level | undefined {
  return byId.get(id);
}

/** The level after `id` in play order, if any. */
export function nextLevel(id: string): Level | undefined {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index >= 0 ? LEVELS[index + 1] : undefined;
}
