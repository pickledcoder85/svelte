// Copies the zxing barcode-reader WASM into public/zxing/<version>/ so the web build serves it
// from our own origin (the library would otherwise fetch it from the jsDelivr CDN at runtime).
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// zxing-wasm exports the WASM file but not its package.json; the package root is two levels up.
const source = require.resolve('zxing-wasm/reader/zxing_reader.wasm');
const packageDir = join(dirname(source), '..', '..');
const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'zxing');
rmSync(publicDir, { recursive: true, force: true }); // Drop older versions.
mkdirSync(join(publicDir, version), { recursive: true });
copyFileSync(source, join(publicDir, version, 'zxing_reader.wasm'));
console.log(`zxing_reader.wasm ${version} copied to public/zxing/${version}/`);
