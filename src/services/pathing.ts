import { existsSync } from 'node:fs';
import path from 'node:path';

export function resolveFirstExistingPath(baseDir: string, candidates: string[]): string {
  for (const candidate of candidates) {
    const resolved = path.resolve(baseDir, candidate);

    if (existsSync(resolved)) {
      return resolved;
    }
  }

  return path.resolve(baseDir, candidates[0]);
}
