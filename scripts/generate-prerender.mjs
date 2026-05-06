#!/usr/bin/env node
// Generate a prerender JSON for a dashboard fixture by driving
// `flowDashboard.generatePrerenderData()` in a real Playwright Chromium
// session. Use this when the prerender-generator.html UI isn't convenient
// (CI, batch regeneration, scripted re-baseline).
//
// Usage:
//   node scripts/generate-prerender.mjs <input.json> [output.json]
//
// Examples:
//   node scripts/generate-prerender.mjs dashboard/data/All.json
//     → writes dashboard/data/All.prerender.json
//
//   node scripts/generate-prerender.mjs dashboard/data/foo.json /tmp/foo-pre.json
//
// The script:
//   1. Spawns the Python static server playwright already uses (port 8000)
//      if it isn't already running. Kills it on exit unless we found one
//      already running.
//   2. Navigates Chromium to /dashboard/flowdash-js.html so window.flowDashboard
//      is available, then calls generatePrerenderData(data).
//   3. Writes the returned object as JSON. Prerender freshness fingerprint
//      (added in dashboard/js/prerenderValidator.js) is embedded automatically
//      via the generator.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('usage: node scripts/generate-prerender.mjs <input.json> [output.json]');
  process.exit(1);
}
const inputPath = path.resolve(inputArg);
const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : inputPath.replace(/\.json$/, '.prerender.json');

const PORT = 8000;
const REPO_ROOT = path.resolve(__dirname, '..');

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1');
    sock.on('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
  });
}

async function ensureServer() {
  if (await isPortOpen(PORT)) {
    console.log(`Static server already running on :${PORT}`);
    return null;
  }
  console.log(`Starting python -m http.server ${PORT} (cwd ${REPO_ROOT})`);
  const proc = spawn('python', ['-m', 'http.server', String(PORT)], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Wait up to 10s for the port to open.
  for (let i = 0; i < 50; i++) {
    if (await isPortOpen(PORT)) return proc;
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error(`Static server did not come up on :${PORT}`);
}

async function main() {
  console.log(`Reading input ${inputPath}`);
  const raw = await fs.readFile(inputPath, 'utf8');
  const data = JSON.parse(raw);

  const serverProc = await ensureServer();
  let exitCode = 0;
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.warn('pageerror:', e.message));
    // Surface the generator's progress logs so the user knows it's working
    // — the layout settle takes ~2s and the position extraction is chatty.
    page.on('console', (msg) => {
      const t = msg.text();
      if (t.startsWith('🎨') || t.startsWith('✅') || t.startsWith('⚠️')) {
        console.log('[browser]', t);
      }
    });

    console.log('Loading flowdash-js.html to bring up window.flowDashboard');
    await page.goto(`http://localhost:${PORT}/dashboard/flowdash-js.html`);
    await page.waitForFunction(() => typeof window.flowDashboard !== 'undefined', {
      timeout: 30_000,
    });

    console.log(`Running generatePrerenderData (input: ${data.nodes?.length ?? 0} root nodes)`);
    const result = await page.evaluate(async (input) => {
      const container = document.createElement('div');
      container.id = 'prerender-temp';
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '-10000px';
      container.style.width = '2000px';
      container.style.height = '2000px';
      document.body.appendChild(container);
      try {
        return await window.flowDashboard.generatePrerenderData(input, '#prerender-temp');
      } finally {
        container.remove();
      }
    }, data);

    if (!result || typeof result !== 'object') {
      throw new Error('generatePrerenderData returned no data');
    }
    const meta = result.settings?.prerenderMetadata;
    console.log(
      `Generated: ${meta?.nodeCount ?? '?'} nodes, ${meta?.edgeCount ?? '?'} edges, fingerprint=${meta?.fingerprint ?? '<none>'}`,
    );

    console.log(`Writing ${outputPath}`);
    await fs.writeFile(outputPath, JSON.stringify(result));
  } catch (e) {
    console.error('Failed to generate prerender:', e);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverProc) {
      console.log('Stopping static server');
      serverProc.kill();
    }
  }
  process.exit(exitCode);
}

main();
