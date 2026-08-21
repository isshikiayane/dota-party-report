'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { loadEnv } = require('./env');

loadEnv();

const { normalizeAccountIds } = require('./accounts');
const { createReport } = require('./report-service');

const PUBLIC_INDEX = path.join(__dirname, '..', 'public', 'index.html');

function send(res, status, type, body, extraHeaders) {
  res.writeHead(status, {
    'content-type': type,
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function errorPage(message) {
  const safe = String(message || '未知错误').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>生成失败</title><body style="margin:0;background:#0d0c0b;color:#f3eee6;font:16px/1.7 system-ui;padding:8vw"><h1>报告生成失败</h1><p>' + safe + '</p><p><a href="/" style="color:#d9b66e">返回账号输入页</a></p></body></html>';
}

function idsFromUrl(url) {
  const values = (url.searchParams.get('ids') || '').split(',').map((item) => item.trim()).filter(Boolean);
  return normalizeAccountIds(values);
}

function openBrowser(url, spawnProcess = spawn) {
  if (process.platform !== 'win32') return false;
  const child = spawnProcess('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.on('error', (error) => console.error('浏览器自动打开失败：' + error.message));
  child.unref();
  return true;
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') {
        return send(res, 200, 'text/html; charset=utf-8', await fs.promises.readFile(PUBLIC_INDEX, 'utf8'));
      }
      if (req.method === 'GET' && url.pathname === '/api/health') {
        return send(res, 200, 'application/json; charset=utf-8', JSON.stringify({ ok: true, service: 'dota-party-report' }));
      }
      if (req.method === 'GET' && (url.pathname === '/report' || url.pathname === '/export')) {
        const ids = idsFromUrl(url);
        const result = await createReport(ids, { refresh: url.searchParams.get('refresh') === '1' });
        const headers = url.pathname === '/export'
          ? { 'content-disposition': 'attachment; filename="dota-party-report-' + ids.join('-') + '.html"' }
          : {};
        return send(res, 200, 'text/html; charset=utf-8', result.html, headers);
      }
      return send(res, 404, 'text/plain; charset=utf-8', 'Not Found');
    } catch (error) {
      console.error('[request error]', error);
      return send(res, 400, 'text/html; charset=utf-8', errorPage(error.message));
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') console.error('启动失败：端口 ' + port + ' 已被占用。请关闭之前打开的程序窗口后重试。');
    else console.error('启动失败：' + error.message);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const localUrl = 'http://localhost:' + port;
    console.log('Dota 2 开黑档案已启动：' + localUrl);
    if (process.env.OPEN_BROWSER === '1') openBrowser(localUrl);
  });
}

module.exports = { createServer, idsFromUrl, openBrowser };
