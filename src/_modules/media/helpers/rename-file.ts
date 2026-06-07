import * as fs from 'fs';
import * as path from 'path';

export function renameFile(currentPath: string, distention: string) {
  if (!fs.existsSync(currentPath)) return;

  if (!fs.existsSync(path.dirname(distention)))
    fs.mkdirSync(path.dirname(distention), { recursive: true });

  return fs.renameSync(currentPath, distention);
}
