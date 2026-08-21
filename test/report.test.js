'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildData, renderReport } = require('../work/build_dota_report');

test('用任意两个账号构建报告并写入公开资料名', () => {
  const ids = ['101', '202'];
  const sameMatch = {
    match_id: 9001,
    start_time: 1700000000,
    duration: 2400,
    radiant_win: true,
    player_slot: 0,
    hero_id: 1,
    kills: 5,
    deaths: 2,
    assists: 9,
    party_size: 2
  };
  const data = buildData({
    ids,
    bundles: {
      101: { profile: { profile: { personaname: '天辉一号' } }, matches: [sameMatch] },
      202: { profile: { profile: { personaname: '天辉二号' } }, matches: [{ ...sameMatch, player_slot: 1, hero_id: 2 }] }
    },
    heroesRaw: {
      1: { id: 1, name: 'npc_dota_hero_antimage', localized_name: 'Anti-Mage', roles: ['Carry'] },
      2: { id: 2, name: 'npc_dota_hero_axe', localized_name: 'Axe', roles: ['Initiator'] }
    },
    officialHeroNames: { antimage: '敌法师', axe: '斧王' },
    defaultSelection: ids
  });

  assert.equal(data.meta.profile_verified, 2);
  assert.equal(data.matches.length, 1);
  assert.equal(data.players['101'].name, '天辉一号');
  assert.equal(data.heroes['1'].name, '敌法师');
  const html = renderReport(data);
  assert.match(html, /window\.DOTA_DATA/);
  assert.match(html, /天辉一号/);
  assert.match(html, /敌法师/);
});
