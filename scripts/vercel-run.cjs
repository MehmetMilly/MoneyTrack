const os = require('node:os');
const { syncBuiltinESMExports } = require('node:module');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const safeHostname = 'CodexHost';

if (typeof os.hostname === 'function') {
  os.hostname = () => safeHostname;
  syncBuiltinESMExports();
}

const cliEntry = pathToFileURL(
  path.resolve(__dirname, '..', 'node_modules', 'vercel', 'dist', 'vc.js')
).href;

import(cliEntry).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
