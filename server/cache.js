'use strict';

const fs = require('fs');
const path = require('path');

const CACHE_ROOT = path.resolve(process.env.CACHE_DIR || path.join(__dirname, '..', '.cache', 'accounts'));

function cachePath(id) {
  if (!/^\d{1,10}$/.test(id)) throw new Error('invalid cache account id');
  return path.join(CACHE_ROOT, id + '.json');
}

async function readAccountCache(id, ttlMs) {
  try {
    const file = cachePath(id);
    const raw = await fs.promises.readFile(file, 'utf8');
    const entry = JSON.parse(raw);
    const age = Date.now() - Date.parse(entry.fetchedAt || 0);
    if (!entry.bundle || !Number.isFinite(age) || age < 0 || age > ttlMs) return null;
    return entry;
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function writeAccountCache(id, bundle) {
  await fs.promises.mkdir(CACHE_ROOT, { recursive: true });
  const file = cachePath(id);
  const temporary = file + '.tmp-' + process.pid + '-' + Date.now();
  const entry = { fetchedAt: new Date().toISOString(), bundle };
  await fs.promises.writeFile(temporary, JSON.stringify(entry), 'utf8');
  await fs.promises.rename(temporary, file);
  return entry;
}

module.exports = { CACHE_ROOT, readAccountCache, writeAccountCache };
