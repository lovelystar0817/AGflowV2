// ESM test script: authenticate + generate QR (uses global fetch in Node 18+)
import { randomUUID } from 'crypto';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function parseSetCookie(setCookieHeaders, jar) {
  if (!setCookieHeaders) return;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const hdr of headers) {
    const [pair] = hdr.split(';');
    const [name, ...rest] = pair.split('=');
    jar[name.trim()] = rest.join('=');
  }
}

function cookieHeaderFromJar(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const headers = opts.headers || {};
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body, redirect: 'manual' });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { res, body: json, text, headers: res.headers };
}

async function main() {
  const jar = {};

  console.log('Fetching CSRF token and session cookie...');
  const csrfResp = await fetch(`${BASE}/api/csrf`);
  // capture cookies
  const setCookie = csrfResp.headers.get('set-cookie');
  if (setCookie) parseSetCookie(setCookie, jar);
  const csrfBody = await csrfResp.json();
  const token = csrfBody.csrfToken;
  if (!token) {
    console.error('Failed to retrieve CSRF token', csrfBody);
    process.exit(1);
  }
  console.log('CSRF token retrieved. Cookie jar:', cookieHeaderFromJar(jar));

  // Register a new test user (this creates a session/login)
  const unique = randomUUID().slice(0,8);
  const email = `test+${unique}@example.com`;
  const password = 'Password123!';
  const registerBody = {
    email,
    password,
    firstName: 'Test',
    lastName: 'User',
    businessName: `TestBiz-${unique}`
  };

  console.log('Registering new user:', email);
  const registerResp = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
      'cookie': cookieHeaderFromJar(jar)
    },
    body: JSON.stringify(registerBody),
    redirect: 'manual'
  });

  const regText = await registerResp.text();
  let regJson;
  try { regJson = JSON.parse(regText); } catch (e) { regJson = regText; }

  // merge any new cookies set by registration
  const regSetCookie = registerResp.headers.get('set-cookie');
  if (regSetCookie) parseSetCookie(regSetCookie, jar);

  if (!registerResp.ok) {
    console.error('Registration failed', registerResp.status, regJson);
    process.exit(1);
  }

  console.log('Registered. Response user id:', regJson.id || regJson);
  const userId = regJson.id;

  // Re-fetch CSRF token for the authenticated session (session-bound)
  console.log('Fetching CSRF token for authenticated session...');
  const csrfResp2 = await fetch(`${BASE}/api/csrf`, { headers: { 'cookie': cookieHeaderFromJar(jar) } });
  const csrf2 = await csrfResp2.json();
  const token2 = csrf2.csrfToken;
  if (!token2) {
    console.error('Failed to retrieve authenticated CSRF token', csrf2);
    process.exit(1);
  }

  console.log('Requesting QR generation for user id', userId);
  const qrResp = await fetch(`${BASE}/api/stylists/${userId}/app-qr`, {
    method: 'POST',
    headers: {
      'x-csrf-token': token2,
      'cookie': cookieHeaderFromJar(jar),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const qrText = await qrResp.text();
  let qrJson;
  try { qrJson = JSON.parse(qrText); } catch (e) { qrJson = qrText; }

  console.log('QR endpoint status:', qrResp.status);
  console.log('QR endpoint body:', qrJson);

  if (qrResp.ok) {
    console.log('QR generated successfully. Now fetching via GET...');
    const getResp = await fetch(`${BASE}/api/stylists/${userId}/app-qr`, {
      headers: { 'cookie': cookieHeaderFromJar(jar) }
    });
    const getJson = await getResp.json();
    console.log('GET /app-qr status:', getResp.status, 'body:', getJson);
  } else {
    console.error('QR generation failed; check server logs for stack traces.');
  }
}

main().catch(err => {
  console.error('Unhandled error in test script:', err);
  process.exit(1);
});
