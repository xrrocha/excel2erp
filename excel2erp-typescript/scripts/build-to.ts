#!/usr/bin/env bun
/**
 * Build to Directory Script
 *
 * Builds both the main app and config editor to an arbitrary directory.
 * Useful for testing with different config files (e.g., legacy/).
 *
 * Usage:
 *   bun scripts/build-to.ts <target-directory>
 *
 * Example:
 *   bun scripts/build-to.ts legacy
 *   # Creates: legacy/excel2erp.html and legacy/excel2erp-editor.html
 */

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: bun scripts/build-to.ts <target-directory>');
  console.error('');
  console.error('Example:');
  console.error('  bun scripts/build-to.ts legacy');
  process.exit(1);
}

const targetDir = resolve(args[0]);

// Ensure target directory exists
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
  console.log(`Created directory: ${targetDir}`);
}

console.log(`Building to: ${targetDir}`);
console.log('');

// Build both apps
console.log('Building main app...');
execSync('bun run build', { stdio: 'inherit' });

console.log('');
console.log('Building config editor...');
execSync('bun run build:editor', { stdio: 'inherit' });

// Copy to target directory
const distDir = resolve('dist');
const appSource = resolve(distDir, 'excel2erp.html');
const editorSource = resolve(distDir, 'excel2erp-editor.html');
const appTarget = resolve(targetDir, 'excel2erp.html');
const editorTarget = resolve(targetDir, 'excel2erp-editor.html');

copyFileSync(appSource, appTarget);
console.log(`Copied: ${appTarget}`);

copyFileSync(editorSource, editorTarget);
console.log(`Copied: ${editorTarget}`);

console.log('');
console.log('Done! Files created:');
console.log(`  - ${appTarget}`);
console.log(`  - ${editorTarget}`);
