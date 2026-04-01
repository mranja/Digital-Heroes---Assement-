import { spawn } from 'node:child_process';
import process from 'node:process';

const BASE_URL = 'http://localhost:5000/api';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const request = async (path, options = {}) => {
  const { headers: extraHeaders = {}, ...rest } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }
  return { res, data, raw };
};

const startServer = () => new Promise((resolve, reject) => {
  const child = spawn('node', ['server/server.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let settled = false;
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true;
      child.kill();
      reject(new Error('Server did not start in time'));
    }
  }, 12000);

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    if (text.includes('Server running on port')) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(child);
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });

  child.on('exit', (code) => {
    if (!settled) {
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Server exited early with code ${code}`));
    }
  });
});

const run = async () => {
  const server = await startServer();

  try {
    const health = await request('/health');
    assert(health.res.ok, 'Health check failed');

    const userLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@user.com', password: 'password' })
    });
    assert(userLogin.res.ok, 'User login failed');
    const userToken = userLogin.data.token;
    assert(Boolean(userToken), 'Missing user token');

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ranjan.m1325@gmail.com', password: 'Admin@digitalheroes' })
    });
    assert(adminLogin.res.ok, 'Admin login failed');
    const adminToken = adminLogin.data.token;
    assert(Boolean(adminToken), 'Missing admin token');

    const userMe = await request('/user/me', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userMe.res.ok, 'Unable to load user profile');

    const cancel = await request('/payment/cancel-subscription', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(cancel.res.ok, 'Cancel subscription failed');

    const renew = await request('/payment/renew-subscription', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(renew.res.ok, 'Renew subscription failed');

    const addScore = await request('/scores', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ score: 39, date: '2026-04-01' })
    });
    assert(
      addScore.res.ok,
      `Adding score failed (${addScore.res.status}): ${addScore.raw}`
    );
    assert((addScore.data.scores || []).length <= 5, 'Score list exceeded 5 entries');

    const charities = await request('/charities');
    assert(charities.res.ok, 'Charity list failed');
    assert((charities.data || []).length > 0, 'No charities returned');

    const firstCharityId = charities.data[0].id;
    const charityProfile = await request(`/charities/${firstCharityId}`);
    assert(charityProfile.res.ok, 'Charity profile failed');

    const createCharity = await request('/charities', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Smoke Test Charity',
        description: 'Validation entity',
        category: 'Test',
        country: 'India',
        featured: false
      })
    });
    assert(createCharity.res.ok, 'Admin create charity failed');
    const createdCharityId = createCharity.data.id;

    const updateCharity = await request(`/charities/${createdCharityId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ featured: true, imageUrl: 'https://example.com/image.jpg' })
    });
    assert(updateCharity.res.ok, 'Admin update charity failed');

    const simulate = await request('/draws/simulate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ mode: 'random' })
    });
    assert(simulate.res.ok, 'Draw simulation failed');

    const publish = await request('/draws/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(publish.res.ok, 'Draw publish failed');

    const summary = await request('/user/admin/summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(summary.res.ok, 'Admin summary failed');
    assert(summary.data.drawStats, 'Admin summary draw stats missing');

    const proofs = await request('/user/admin/proofs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(proofs.res.ok, 'Admin proofs fetch failed');

    const deleteCharity = await request(`/charities/${createdCharityId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteCharity.res.ok, 'Admin delete charity failed');

    console.log('Smoke tests passed');
  } finally {
    server.kill();
    await delay(400);
  }
};

run().catch((err) => {
  console.error(`Smoke tests failed: ${err.message}`);
  process.exit(1);
});
