const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const hostConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode'],
  outfile: 'out/extension.js',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

const webviewConfig = {
  entryPoints: { webview: 'src/webview/main.ts' },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  outdir: 'media/webview',
  loader: { '.css': 'css' },
  external: ['*.woff2'],
  sourcemap: !production ? 'inline' : false,
  minify: production,
  logLevel: 'info',
};

async function run() {
  if (watch) {
    const hostCtx = await esbuild.context(hostConfig);
    const webviewCtx = await esbuild.context(webviewConfig);
    await Promise.all([hostCtx.watch(), webviewCtx.watch()]);
    console.log('[esbuild] watching host + webview...');
  } else {
    await Promise.all([esbuild.build(hostConfig), esbuild.build(webviewConfig)]);
    console.log('[esbuild] host + webview build complete');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
