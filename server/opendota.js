'use strict';

const { readAccountCache, writeAccountCache } = require('./cache');

const API_ROOT = process.env.OPENDOTA_API_ROOT || 'https://api.opendota.com/api';
const DEFAULT_TTL_HOURS = Number(process.env.CACHE_TTL_HOURS || 12);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 45000);

function apiUrl(pathname, params) {
  const url = new URL(API_ROOT + pathname);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== '' && value != null) url.searchParams.set(key, String(value));
  }
  if (process.env.OPENDOTA_API_KEY) url.searchParams.set('api_key', process.env.OPENDOTA_API_KEY);
  return url;
}

async function fetchJson(url, attempt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'dota-party-report-local/1.0' },
      signal: controller.signal
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      return fetchJson(url, attempt + 1);
    }
    if (!response.ok) throw new Error('OpenDota请求失败（HTTP ' + response.status + '）');
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('OpenDota请求超时');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAccountBundle(id) {
  const [profile, matches] = await Promise.all([
    fetchJson(apiUrl('/players/' + id), 1),
    fetchJson(apiUrl('/players/' + id + '/matches', { significant: 0, limit: 10000 }), 1)
  ]);
  if (!Array.isArray(matches)) throw new Error('账号 ' + id + ' 的比赛历史格式异常');
  return { profile, matches };
}

async function getAccountBundle(id, options) {
  const ttlMs = Math.max(1, DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
  if (!options.refresh) {
    const cached = await readAccountCache(id, ttlMs);
    if (cached) return { id, bundle: cached.bundle, fetchedAt: cached.fetchedAt, cached: true };
  }
  const bundle = await fetchAccountBundle(id);
  const saved = await writeAccountCache(id, bundle);
  return { id, bundle, fetchedAt: saved.fetchedAt, cached: false };
}

async function getAccountBundles(ids, options = {}) {
  const rows = await Promise.all(ids.map((id) => getAccountBundle(id, options)));
  return {
    bundles: Object.fromEntries(rows.map((row) => [row.id, row.bundle])),
    fetchedAt: rows.map((row) => row.fetchedAt).sort().at(-1),
    cacheHits: rows.filter((row) => row.cached).length
  };
}

module.exports = { getAccountBundles };
