'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer, idsFromUrl, openBrowser } = require('../server/index');

test('读取逗号分隔账号并转换 Steam64', () => {
  const steam64 = (76561197960265728n + 987654321n).toString();
  assert.deepEqual(idsFromUrl(new URL('http://local/report?ids=123456789,' + steam64)), ['123456789', '987654321']);
});

test('健康检查和首页无需外网即可访问', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'dota-party-report' });
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Dota 2 开黑档案/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('首页内嵌脚本语法有效', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const scripts = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g), (match) => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Function(scripts[0]));
});

test('Windows 启动器通过系统默认网址处理程序打开浏览器', () => {
  if (process.platform !== 'win32') return;
  let call;
  let detached = false;
  const fakeSpawn = (command, args, options) => {
    call = { command, args, options };
    return { on() { return this; }, unref() { detached = true; } };
  };
  assert.equal(openBrowser('http://localhost:3000', fakeSpawn), true);
  assert.equal(call.command, 'rundll32.exe');
  assert.deepEqual(call.args, ['url.dll,FileProtocolHandler', 'http://localhost:3000']);
  assert.equal(call.options.windowsHide, true);
  assert.equal(detached, true);
});
