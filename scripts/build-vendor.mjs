// Rebuild committed browser assets: npm ci --ignore-scripts && npm run build:vendor
import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const vendor = join(root, 'vendor');
await mkdir(vendor, { recursive: true });
const browserOnly = { name: 'browser-only', setup(builder) {
  builder.onLoad({ filter: /kokoro-js\/dist\/kokoro\.js$/ }, async args => {
    const source = await readFile(args.path, 'utf8');
    const upstream = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/';
    if (!source.includes(upstream)) throw new Error('Kokoro voice loader changed; review the local asset rewrite.');
    return { contents: source.replace(upstream, './kokoro-model/voices/'), loader: 'js' };
  });
  builder.onResolve({ filter: /^(node:)?(fs|fs\/promises|path|crypto|module|os)$/ }, args => ({ path: args.path, namespace: 'empty-node' }));
  builder.onLoad({ filter: /.*/, namespace: 'empty-node' }, () => ({ contents: 'export default {};', loader: 'js' }));
} };
const common = { bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, legalComments: 'linked', plugins: [browserOnly] };
await build({ ...common, alias: { 'onnxruntime-web': join(root, 'node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs') }, entryPoints: [join(root, 'node_modules/@paddleocr/paddleocr-js/dist/index.mjs')], outfile: join(vendor, 'paddle.js') });
await build({ ...common, entryPoints: [join(root, 'scripts/tts-entry.js')], outfile: join(vendor, 'tts.js') });
const ortRoot = join(root, 'node_modules/onnxruntime-web');
const transformersRequire = createRequire(require.resolve('@huggingface/transformers'));
const ttsOrtRoot = resolve(dirname(transformersRequire.resolve('onnxruntime-web')), '..');
for (const [source, name] of [[ortRoot, 'ocr-ort'], [ttsOrtRoot, 'tts-ort']]) {
  const dest = join(vendor, name);
  await mkdir(dest, { recursive: true });
  for (const file of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
    await cp(join(source, 'dist', file), join(dest, file));
  }
}
// Preserve upstream license files alongside the distributable assets.
const licenses = join(vendor, 'licenses');
await mkdir(licenses, { recursive: true });
for (const pkg of ['@paddleocr/paddleocr-js', '@huggingface/transformers', 'kokoro-js', 'phonemizer', '@techstark/opencv-js', 'clipper-lib', 'js-yaml', 'onnxruntime-web', 'onnxruntime-common']) {
  const dir = join(root, 'node_modules', pkg);
  for (const file of await readdir(dir)) if (/^(LICENSE|COPYING|NOTICE)/i.test(file)) await cp(join(dir, file), join(licenses, `${pkg.replaceAll('/', '_')}-${file}`), { recursive: true });
}
const lock = JSON.parse(await readFile(join(root, 'package-lock.json')));
await writeFile(join(vendor, 'versions.json'), JSON.stringify(Object.fromEntries(Object.entries(lock.packages).filter(([k]) => k).map(([k, v]) => [k, { version: v.version, license: v.license }])), null, 2));
console.log('Browser bundles and matching WASM files are ready in vendor/.');
