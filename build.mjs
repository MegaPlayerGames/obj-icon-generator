import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/app.js'], outfile: 'dist/app.js', bundle: true, minify: true, format: 'esm', target: ['es2022'], sourcemap: false, legalComments: 'linked' });
await copyFile('src/index.html', 'dist/index.html');
await copyFile('src/style.css', 'dist/style.css');
await writeFile('dist/THIRD_PARTY_LICENSES.txt','Three.js\n'+await readFile('node_modules/three/LICENSE','utf8')+'\n\nfflate\n'+await readFile('node_modules/fflate/LICENSE','utf8'));
console.log('Built Crystal Icon Studio.');
