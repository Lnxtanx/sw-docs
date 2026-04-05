#!/usr/bin/env node

/**
 * Main build script - runs both nav tree and content manifest generation
 * This is called before vite build (see package.json build script)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runScript(scriptPath, scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔨 Running ${scriptName}...`);
    const proc = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${scriptName} completed successfully\n`);
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function buildAll() {
  try {
    console.log('📚 Building Schema Weaver Docs System\n');

    // 1. Generate navigation tree
    await runScript(
      path.join(__dirname, 'generate-nav-tree.js'),
      'Navigation Tree Generator'
    );

    // 2. Build docs (parse MDX and generate manifest)
    await runScript(
      path.join(__dirname, 'build-docs.js'),
      'MDX Parser & Manifest Generator'
    );

    // 3. Generate search index
    await runScript(
      path.join(__dirname, 'generate-search-index.js'),
      'Search Index Generator'
    );

    // 4. Generate llms.txt (AI agent manifest)
    await runScript(
      path.join(__dirname, 'generate-llms-txt.js'),
      'LLMs.txt Generator'
    );

    // 5. Generate sitemap.xml
    await runScript(
      path.join(__dirname, 'generate-sitemap.js'),
      'Sitemap Generator'
    );

    console.log('✅ All build steps completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildAll();
