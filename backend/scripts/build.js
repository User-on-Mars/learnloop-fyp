#!/usr/bin/env node
/**
 * Backend build script.
 *
 * This backend is pure Node.js ESM, so there is no transpile step.
 * The "build" here performs a static validation pass:
 *   1. Collects every .js file under src/ and scripts/ (excluding tests & node_modules).
 *   2. Syntax-checks each file with `node --check`.
 *   3. Reports per-file results and exits non-zero on any failure.
 *
 * Run via `npm run build` from the backend workspace.
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const BACKEND_ROOT = resolve(__filename, '..', '..');

const ROOTS = ['src', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'logs', '.dist']);
const SKIP_FILE_SUFFIXES = ['.test.js', '.spec.js'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, out);
    } else if (st.isFile()) {
      if (!name.endsWith('.js')) continue;
      if (SKIP_FILE_SUFFIXES.some((s) => name.endsWith(s))) continue;
      out.push(full);
    }
  }
  return out;
}

function checkFile(file) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });
  return {
    file,
    ok: result.status === 0,
    stderr: result.stderr?.trim() ?? '',
    stdout: result.stdout?.trim() ?? '',
  };
}

function main() {
  const started = Date.now();
  const files = ROOTS.flatMap((r) => walk(join(BACKEND_ROOT, r)));

  if (files.length === 0) {
    console.error('No source files found under:', ROOTS.join(', '));
    process.exit(1);
  }

  console.log(`Backend build: syntax-checking ${files.length} files...`);

  const failures = [];
  for (const file of files) {
    const res = checkFile(file);
    const rel = relative(BACKEND_ROOT, file);
    if (!res.ok) {
      failures.push(res);
      console.log(`  ✗ ${rel}`);
      if (res.stderr) console.log(res.stderr);
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(2);
  if (failures.length > 0) {
    console.error(`\nBuild failed: ${failures.length} file(s) with syntax errors (${elapsed}s)`);
    process.exit(1);
  }

  console.log(`\nBuild succeeded: ${files.length} files OK (${elapsed}s)`);
}

main();
