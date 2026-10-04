import {createRequire} from 'node:module';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {build} = require('esbuild');
const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  absWorkingDir: root, entryPoints: [resolve(root, 'src/main.tsx')], bundle: true, write: false,
  minify: true, format: 'iife', target: ['es2020'], jsx: 'automatic',
  define: {'process.env.NODE_ENV': '"production"'}, legalComments: 'inline',
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(delimiter) : [],
});
const css = await readFile(resolve(root, 'src/styles.css'), 'utf8');
const favicon = await readFile(resolve(root, 'src/favicon.svg'), 'utf8');
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vía Libre Valledupar · Demostración</title>
<meta name="description" content="Reporta obstáculos, explora el mapa y simula su revisión en Valledupar. Prueba de concepto con datos guardados en tu navegador.">
<meta name="theme-color" content="#075b45">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(favicon)}">
<style>${css}</style></head><body>
<div id="app"></div><noscript>Activa JavaScript para usar esta demostración.</noscript>
<script>${script}</script></body></html>`;
await writeFile(resolve(root, 'index.html'), html);
console.log(`Web estática lista: index.html (${Math.round(Buffer.byteLength(html) / 1024)} KB).`);
