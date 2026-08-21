'use strict';

const STEAM64_BASE = 76561197960265728n;
const MAX_ACCOUNT_ID = 4294967295n;

function extractNumericValue(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) throw new Error('账号ID不能为空');

  const match = raw.match(/(\d{6,20})(?:\/?(?:[?#].*)?)?$/);
  if (!match) throw new Error('无法识别账号：' + raw);
  return match[1];
}

function toAccountId(input) {
  const numeric = BigInt(extractNumericValue(input));
  const accountId = numeric > MAX_ACCOUNT_ID ? numeric - STEAM64_BASE : numeric;
  if (accountId <= 0n || accountId > MAX_ACCOUNT_ID) throw new Error('账号ID超出有效范围：' + input);
  return accountId.toString();
}

function normalizeAccountIds(inputs) {
  const ids = Array.from(new Set((inputs || []).map(toAccountId)));
  if (ids.length < 2 || ids.length > 5) throw new Error('请输入2–5个不同的Dota账号ID');
  return ids;
}

module.exports = { normalizeAccountIds, toAccountId };
