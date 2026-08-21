'use strict';

const fs = require('fs');
const path = require('path');
const { buildData, renderReport } = require('../work/build_dota_report');
const { getAccountBundles } = require('./opendota');

const HEROES_RAW = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'work', 'od_heroes.json'), 'utf8'));
const HERO_NAMES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'work', 'official_hero_names.json'), 'utf8'));

async function createReport(ids, options = {}) {
  const fetched = await getAccountBundles(ids, { refresh: !!options.refresh });
  const data = buildData({
    ids,
    bundles: fetched.bundles,
    heroesRaw: HEROES_RAW,
    officialHeroNames: HERO_NAMES,
    fetchedAt: fetched.fetchedAt,
    defaultSelection: ids
  });
  data.meta.cache_hits = fetched.cacheHits;
  return { data, html: renderReport(data) };
}

module.exports = { createReport };
