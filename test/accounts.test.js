'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAccountIds, toAccountId } = require('../server/accounts');

test('保留 Dota Account ID', () => {
  assert.equal(toAccountId('123456789'), '123456789');
});

test('把 Steam64 和个人资料链接转换为 Account ID', () => {
  const steam64 = (76561197960265728n + 123456789n).toString();
  assert.equal(toAccountId(steam64), '123456789');
  assert.equal(toAccountId('https://www.opendota.com/players/' + steam64), '123456789');
});

test('去重后仍要求 2–5 个不同账号', () => {
  assert.deepEqual(normalizeAccountIds(['123456789', '987654321']), ['123456789', '987654321']);
  assert.throws(() => normalizeAccountIds(['123456789', '123456789']), /2–5/);
  assert.throws(() => normalizeAccountIds(['0', '1']), /无法识别|有效范围/);
});
