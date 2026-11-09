// Shared driver for the opt-in Nakama suites. A missing SHOOTER_E2E_NAKAMA skips
// with exit 0 so CI does not start Nakama. Flag rows are flipped only when this
// process is asked to, and the caller puts them back to off.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { clearIssuedBoss } from './issued-clear.mjs';

export const GAME_ID = 'sproto-shooter';
const FLAG_KEYS = ['shooter_pvp', 'shooter_pvp_wager'];

export function optedIn() {
  return process.env.SHOOTER_E2E_NAKAMA === '1';
}

export function skipIfDark() {
  if (optedIn()) return false;
  console.log('SHOOTER_E2E_NAKAMA is unset. Nakama e2e skipped.');
  return true;
}

function readEnvFile(file) {
  const out = {};
  if (!file || !fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function stackEnv() {
  const file = readEnvFile(process.env.NAKAMA_ENV_FILE || '');
  return {
    nakama: (process.env.NAKAMA_URL || 'http://127.0.0.1:7350').replace(/\/$/, ''),
    serverKey: process.env.NAKAMA_SERVER_KEY || file.NAKAMA_SERVER_KEY || 'defaultkey',
    pgPassword: process.env.PGPASSWORD || file.POSTGRES_PASSWORD || '',
    pgHost: process.env.PGHOST || '127.0.0.1',
    pgDatabase: process.env.PGDATABASE || 'nakama',
    pgUser: process.env.PGUSER || 'postgres',
  };
}

function basic(serverKey) {
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
}

function claims(token) {
  const part = token.split('.')[1] || '';
  return JSON.parse(Buffer.from(part, 'base64url').toString());
}

export function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function readBody(response) {
  const text = await response.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch { body = { message: text.slice(0, 240) }; }
  }
  return body;
}

export function createNakama() {
  const env = stackEnv();
  return {
    url: env.nakama,
    async health() {
      const target = process.env.NAKAMA_HEALTH_URL || 'http://127.0.0.1:7350/healthcheck';
      const response = await fetch(target, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`nakama health ${response.status}`);
    },
    async account({ guest = false } = {}) {
      const tag = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const username = `s7${tag}`.slice(0, 20);
      const url = guest
        ? `${env.nakama}/v2/account/authenticate/device?create=true`
        : `${env.nakama}/v2/account/authenticate/email?create=true&username=${username}`;
      const payload = guest
        ? { id: `device-${tag}` }
        : { email: `${username}@example.com`, password: 's7-accept-pass' };
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: basic(env.serverKey), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const body = await readBody(response);
      if (!response.ok || !body.token) throw new Error(`auth ${response.status}`);
      const tokenClaims = claims(body.token);
      return {
        token: body.token,
        userId: tokenClaims.uid,
        username: guest ? '' : username,
        guest,
      };
    },
    async rpc(token, id, payload = {}) {
      const response = await fetch(`${env.nakama}/v2/rpc/${encodeURIComponent(id)}?unwrap=true`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const body = await readBody(response);
      return { status: response.status, body };
    },
    async portal(hubToken) {
      const opened = await this.rpc(hubToken, 'portal.enter', { game: GAME_ID, ranked: false });
      if (!opened.body || !opened.body.ticket) throw new Error(`portal.enter ${opened.status}`);
      return opened.body;
    },
    async balance(gameToken) {
      const result = await this.rpc(gameToken, 'tickets.balance', { game: GAME_ID });
      if (typeof result.body.balance !== 'number') throw new Error(`balance ${result.status}`);
      return result.body.balance;
    },
    sql(statement) {
      if (!env.pgPassword) throw new Error('PGPASSWORD or NAKAMA_ENV_FILE is required for flag rows');
      return execFileSync('psql', [
        '-h', env.pgHost, '-U', env.pgUser, '-d', env.pgDatabase,
        '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', statement,
      ], {
        env: { ...process.env, PGPASSWORD: env.pgPassword },
        encoding: 'utf8',
      }).trim();
    },
    flags(state) {
      const list = FLAG_KEYS.map((key) => `'${key}'`).join(', ');
      this.sql(`UPDATE game.server_flags SET state = '${state}', updated_at = now() WHERE key IN (${list})`);
      const rows = this.sql(`SELECT key || '=' || state FROM game.server_flags WHERE key IN (${list}) ORDER BY key`);
      return rows;
    },
  };
}

export async function waitForNakama(nakama, attempts = 60) {
  let last = 'not ready';
  for (let i = 0; i < attempts; i += 1) {
    try {
      await nakama.health();
      return;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`nakama did not answer: ${last}`);
}

export function shotDir() {
  const dir = process.env.SHOOTER_E2E_SHOTS || '/opt/cursor/artifacts';
  fs.mkdirSync(dir, { recursive: true });
  const fixture = path.resolve('tests/fixtures/screenshots/s7');
  fs.mkdirSync(fixture, { recursive: true });
  return { artifacts: dir, fixture };
}

export async function shot(page, name) {
  const dirs = shotDir();
  const artifact = path.join(dirs.artifacts, name);
  await page.screenshot({ path: artifact });
  fs.copyFileSync(artifact, path.join(dirs.fixture, name));
  if (fs.statSync(artifact).size < 1000) throw new Error(`${name} is too small`);
  return artifact;
}

const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];

export async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, args: GL_ARGS });
  } catch {
    execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
    return chromium.launch({ headless: true, args: GL_ARGS });
  }
}

export function hubStub() {
  let lastUrl = '';
  const server = http.createServer((req, res) => {
    lastUrl = req.url || '';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>hub stub</title><h1 data-hub-stub>hub</h1><p data-hub-hash></p><script>document.querySelector('[data-hub-hash]').textContent=location.hash</script>`);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/`,
        lastPath: () => lastUrl,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

export async function viteGame({ hubUrl, port = 4173 }) {
  const origin = `http://127.0.0.1:${port}`;
  // Same origin as the page so the dev server's /v2 and /ws proxy reaches Nakama
  // without a browser CORS hop. Node calls Nakama on :7350 directly.
  process.env.VITE_NAKAMA_URL = origin;
  process.env.VITE_HUB_URL = hubUrl;
  const server = await createServer({
    server: { host: '127.0.0.1', port, strictPort: true },
    logLevel: 'error',
  });
  await server.listen();
  return {
    origin,
    close: () => server.close(),
  };
}

export async function openGame(browser, origin, ticket, { context = null } = {}) {
  const own = !context;
  const ctx = context || await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  const hash = ticket ? `#t=${encodeURIComponent(ticket)}` : '';
  await page.goto(`${origin}/${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('[data-go="pvp"], [data-hub="error"], [data-hub="offline"]', { timeout: 45000 });
  return { context: ctx, page, errors, close: async () => { if (own) await ctx.close(); else await page.close(); } };
}

export async function pageBalance(page) {
  return page.evaluate(async () => {
    const session = window.__sproto?.game?.hub?.api?.getSession?.();
    if (!session || !session.token) return null;
    const response = await fetch(`${location.origin}/v2/rpc/tickets.balance?unwrap=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'sproto-shooter' }),
    });
    const body = await response.json();
    return typeof body.balance === 'number' ? body.balance : null;
  });
}

export async function pageRpc(page, id, payload) {
  return page.evaluate(async ({ id, payload }) => {
    const session = window.__sproto?.game?.hub?.api?.getSession?.();
    if (!session || !session.token) return { error: 'no_session' };
    const response = await fetch(`${location.origin}/v2/rpc/${encodeURIComponent(id)}?unwrap=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch { return { error: 'bad_json', status: response.status }; }
  }, { id, payload });
}

export function issuedClear(issuance) {
  const recorded = clearIssuedBoss(issuance);
  if (!recorded.receipt || recorded.receipt.ok !== true || recorded.receipt.outcome !== 'clear' || recorded.receipt.eligible !== true) {
    throw new Error(`local clear was ${recorded.receipt && recorded.receipt.reason}`);
  }
  if (recorded.receipt.ticketsMinted !== 0) throw new Error('local clear minted');
  return recorded;
}

export async function fundWithClear(page, boss = 'sahil') {
  const key = `s7-${boss}-${crypto.randomUUID()}`;
  const issued = await pageRpc(page, 'shooter.run.issue', { key, canonicalBoss: boss });
  if (!issued || issued.ok !== true || !issued.issuance) throw new Error(`issue ${issued && (issued.reason || issued.error)}`);
  const recorded = issuedClear(issued.issuance);
  const submitted = await pageRpc(page, 'shooter.run.submit', { runId: issued.issuance.runId, log: recorded.log });
  const balance = await pageBalance(page);
  return { issued, submitted, balance, frames: recorded.receipt.frames, stateHash: recorded.receipt.stateHash };
}
