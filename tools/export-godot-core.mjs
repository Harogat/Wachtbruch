import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createGodotContentBundle,
  validateGodotContentBundle
} from '../modules/godot/content-bundle.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requestedTarget = process.argv[2];
const target = requestedTarget
  ? isAbsolute(requestedTarget) ? requestedTarget : resolve(root, requestedTarget)
  : join(root, 'exports', 'godot', 'wachtbruch-core-data.json');

const bundle = createGodotContentBundle();
const failures = validateGodotContentBundle(bundle);
if (failures.length) {
  console.error('Godot-Kernexport fehlgeschlagen:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
console.log(`Godot-Kernexport geschrieben: ${target}`);
console.log(`Assets: ${Object.keys(bundle.assets).length}`);
console.log(`Waffen: ${Object.keys(bundle.attacks).length}`);
console.log(`Gegner: ${Object.keys(bundle.enemies).length}`);
console.log(`Raeume: ${bundle.rooms.rooms.length}`);
console.log(`Upgrades: ${bundle.progression.upgrades.length}`);
