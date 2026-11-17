import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'net';
import { createApp } from '../../server';
import { loadServerConfig } from '../config/env';
import { closeDatabasePool, getPool, isDatabaseConfigured, query, withTransaction } from '../db/connection';
import { runMigrations } from '../db/migrate';
import { INITIAL_ACTIVITY_TYPES, seedActivityTypes } from '../db/seeds/seedActivityTypes';
import { seedEmissionFactors, VERIFIED_EMISSION_FACTORS } from '../db/seeds/seedEmissionFactors';

const HAS_DB = isDatabaseConfigured();
const SKIP_REASON = HAS_DB
  ? false
  : 'DATABASE_URL is not configured in this environment';

function extractCookieHeader(setCookies: string[] | undefined): string {
  if (!setCookies || setCookies.length === 0) return '';
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

async function createAuthenticatedUserSession(
  baseUrl: string,
  fullName: string,
  email: string
): Promise<{ cookie: string; csrfToken: string; userId: string }> {
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfRes.status, 200);
  let cookie = extractCookieHeader(csrfRes.headers.getSetCookie());
  const { csrfToken: initialCsrf } = (await csrfRes.json()) as { csrfToken: string };

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': initialCsrf,
      Cookie: cookie,
    },
    body: JSON.stringify({
      fullName,
      email,
      password: 'Password123',
      confirmPassword: 'Password123',
    }),
  });
  assert.equal(regRes.status, 201);
  const regCookies = extractCookieHeader(regRes.headers.getSetCookie());
  if (regCookies) cookie = regCookies;

  const regBody = (await regRes.json()) as {
    user: { id: string };
    csrfToken: string;
  };
  return {
    cookie,
    csrfToken: regBody.csrfToken,
    userId: regBody.user.id,
  };
}

test('health endpoint returns ok (Phase 3) and protected activity routes fail closed without auth/DB', async () => {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(healthRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(healthRes.headers.get('x-powered-by'), null);
    const body = (await healthRes.json()) as {
      status: string;
      phase: number;
      database: { configured: boolean; status: string };
    };
    assert.equal(body.phase, 6);
    assert.equal(body.database.configured, HAS_DB);

    const expectedUnauthStatus = HAS_DB ? 401 : 503;
    for (const path of [
      '/api/activity-types',
      '/api/activities',
      '/api/activities/summary',
      '/api/analytics/overview',
      '/api/analytics/monthly-trend',
      '/api/analytics/category-breakdown',
      '/api/analytics/daily-trend',
      '/api/analytics/top-category',
      '/api/analytics/recent-activities',
      '/api/goals',
      '/api/goals/current',
      '/api/recommendations',
      '/api/reports/monthly',
      '/api/reports/export',
      '/api/profile',
    ]) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.equal(res.status, expectedUnauthStatus, `Expected ${expectedUnauthStatus} for ${path}`);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Production configuration fails clearly when SESSION_SECRET is missing or too short', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.SESSION_SECRET;

  try {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'short-secret';
    assert.throws(
      () => loadServerConfig(),
      /SESSION_SECRET must be configured with at least 32 characters in production/
    );

    process.env.SESSION_SECRET = 'a'.repeat(32);
    const prodConfig = loadServerConfig();
    assert.equal(prodConfig.isProduction, true);
    assert.equal(prodConfig.hasExplicitSessionSecret, true);
  } finally {
    if (prevEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = prevEnv;
    }
    if (prevSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = prevSecret;
    }
  }
});

test('MySQL migrations, constraints, and idempotent activity_types + emission_factors seeds run cleanly', { skip: SKIP_REASON }, async () => {
  await runMigrations();
  await seedActivityTypes();
  const secondSeedInserted = await seedActivityTypes();
  assert.equal(secondSeedInserted, 0);

  const factorsCount = await seedEmissionFactors();
  assert.ok(factorsCount >= VERIFIED_EMISSION_FACTORS.length);
  const secondFactorsCount = await seedEmissionFactors();
  assert.equal(secondFactorsCount, VERIFIED_EMISSION_FACTORS.length);

  // Verify all 5 academic tables + session infrastructure table exist
  const tablesRes = await query<{ table_name: string }>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `
  );
  const tableNames = new Set(tablesRes.rows.map((r) => r.table_name));
  for (const required of [
    'users',
    'activity_types',
    'emission_factors',
    'activity_logs',
    'monthly_goals',
    'sessions',
  ]) {
    assert.ok(tableNames.has(required), `Missing table: ${required}`);
  }

  // Verify 8 seeded activity types exist
  const seededTypes = await query<{ count: string | number }>(
    'SELECT COUNT(*) AS count FROM activity_types'
  );
  assert.ok(Number(seededTypes.rows[0].count) >= INITIAL_ACTIVITY_TYPES.length);

  // Verify duplicate activity type constraint
  await assert.rejects(
    query(
      "INSERT INTO activity_types (category, name, unit) VALUES ('Transportation', 'Car Travel', 'km')"
    )
  );

  // Verify unique email and goal month constraints using isolated rollback transaction
  await withTransaction(async (client) => {
    const userRes = await client.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ('Test Constraint User', 'constraints@test.local', 'hash')"
    );
    const userId = userRes.insertId ?? userRes.rows[0]?.id;

    // Duplicate email rejected
    await client.query('SAVEPOINT sp_dup_email');
    await assert.rejects(
      client.query(
        "INSERT INTO users (full_name, email, password_hash) VALUES ('Dup', 'constraints@test.local', 'hash')"
      )
    );
    await client.query('ROLLBACK TO SAVEPOINT sp_dup_email');

    // Duplicate user+month rejected
    await client.query(
      'INSERT INTO monthly_goals (user_id, goal_month, target_co2e) VALUES (?, ?, 200)',
      [userId, '2026-11-01']
    );
    await client.query('SAVEPOINT sp_goal_dup');
    await assert.rejects(
      client.query(
        'INSERT INTO monthly_goals (user_id, goal_month, target_co2e) VALUES (?, ?, 300)',
        [userId, '2026-11-01']
      )
    );
    await client.query('ROLLBACK TO SAVEPOINT sp_goal_dup');

    throw new Error('ROLLBACK_TEST_TRANSACTION');
  }).catch((err) => {
    if (err.message !== 'ROLLBACK_TEST_TRANSACTION') throw err;
  });
});

test('Authentication lifecycle: CSRF, register, duplicate, login, /me, profile update, logout', { skip: SKIP_REASON }, async () => {
  await runMigrations();
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const testEmail = `e2e_${Date.now()}@ecotrack.test`;

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    // 1. Unauthenticated /api/auth/me denied
    const unauthMe = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(unauthMe.status, 401);

    // 2. Mutating request without CSRF token rejected (403)
    const missingCsrf = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'No Token',
        email: testEmail,
        password: 'Password123',
        confirmPassword: 'Password123',
      }),
    });
    assert.equal(missingCsrf.status, 403);

    // 3. Fetch CSRF token + session cookie
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
    assert.equal(csrfRes.status, 200);
    let cookie = extractCookieHeader(csrfRes.headers.getSetCookie());
    let { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    assert.ok(csrfToken);

    // 4. Register valid user
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
      },
      body: JSON.stringify({
        fullName: 'Phase Two Tester',
        email: `  ${testEmail.toUpperCase()} `,
        password: 'Password123',
        confirmPassword: 'Password123',
      }),
    });
    assert.equal(registerRes.status, 201);
    const regBody = (await registerRes.json()) as {
      user: { id: string; fullName: string; email: string; password_hash?: string };
    };
    assert.equal(regBody.user.email, testEmail);
    assert.equal(regBody.user.password_hash, undefined);

    // 5. Duplicate registration rejected with 409
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
      },
      body: JSON.stringify({
        fullName: 'Duplicate User',
        email: testEmail,
        password: 'Password123',
        confirmPassword: 'Password123',
      }),
    });
    assert.equal(dupRes.status, 409);

    // 6. Invalid login returns 401
    const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
      },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword!' }),
    });
    assert.equal(badLogin.status, 401);

    // 7. Valid login creates persisted session cookie and rotates CSRF token
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
      },
      body: JSON.stringify({ email: testEmail, password: 'Password123' }),
    });
    assert.equal(loginRes.status, 200);
    const loginCookies = extractCookieHeader(loginRes.headers.getSetCookie());
    if (loginCookies) cookie = loginCookies;
    const loginBody = (await loginRes.json()) as {
      user: { fullName: string; email: string };
      csrfToken: string;
    };
    assert.equal(loginBody.user.fullName, 'Phase Two Tester');
    csrfToken = loginBody.csrfToken;

    // 8. Session persists on /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    assert.equal(meRes.status, 200);
    const meBody = (await meRes.json()) as { user: { fullName: string } };
    assert.equal(meBody.user.fullName, 'Phase Two Tester');

    // 9. Profile update updates authenticated user
    const patchRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
      },
      body: JSON.stringify({ fullName: 'Updated Tester' }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = (await patchRes.json()) as { user: { fullName: string } };
    assert.equal(patchBody.user.fullName, 'Updated Tester');

    // 10. Logout destroys session
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
        Cookie: cookie,
      },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogoutMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    assert.equal(afterLogoutMe.status, 401);
  } finally {
    await getPool().query('DELETE FROM users WHERE email = $1', [testEmail]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Phase 3 Activity CRUD, backend emission calculations, filters, summary, and ownership isolation', { skip: SKIP_REASON }, async () => {
  await runMigrations();
  await seedEmissionFactors();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const userAEmail = `phase3_a_${Date.now()}@ecotrack.test`;
  const userBEmail = `phase3_b_${Date.now()}@ecotrack.test`;

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const userA = await createAuthenticatedUserSession(baseUrl, 'User Alpha', userAEmail);
    const userB = await createAuthenticatedUserSession(baseUrl, 'User Beta', userBEmail);

    // 1. Fetch dynamic activity types from PostgreSQL
    const typesRes = await fetch(`${baseUrl}/api/activity-types`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(typesRes.status, 200);
    const typesBody = (await typesRes.json()) as {
      items: Array<{ id: string; name: string; unit: string; category: string; hasEmissionFactor: boolean }>;
    };
    const carType = typesBody.items.find((t) => t.name === 'Car Travel');
    const electricityType = typesBody.items.find((t) => t.name === 'Electricity Consumption');
    const plantMealType = typesBody.items.find((t) => t.name === 'Plant-Based Meal');
    assert.ok(carType && carType.hasEmissionFactor);
    assert.ok(electricityType && electricityType.hasEmissionFactor);
    assert.ok(plantMealType && !plantMealType.hasEmissionFactor);

    // 2. Missing CSRF token on POST /api/activities rejected with 403
    const noCsrfRes = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: carType.id,
        quantity: '10',
        activityDate: '2026-11-10',
      }),
    });
    assert.equal(noCsrfRes.status, 403);

    // 3. Invalid negative quantity rejected with 400
    const badQtyRes = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: carType.id,
        quantity: '-5',
        activityDate: '2026-11-10',
      }),
    });
    assert.equal(badQtyRes.status, 400);

    // 4. Unconfigured lifestyle meal factor rejected honestly with 422
    const mealRes = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: plantMealType.id,
        quantity: '2',
        activityDate: '2026-11-10',
      }),
    });
    assert.equal(mealRes.status, 422);
    const mealErr = (await mealRes.json()) as { error: string };
    assert.match(mealErr.error, /Emission factor unavailable/i);

    // 5. Create valid Car Travel activity (25.5 km * 0.14000000 = 3.570000 kg CO2e)
    const createCarRes = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: carType.id,
        quantity: '25.5',
        unit: 'km',
        activityDate: '2026-11-10',
      }),
    });
    assert.equal(createCarRes.status, 201);
    const createdCarBody = (await createCarRes.json()) as {
      activity: {
        id: string;
        calculatedCo2e: number;
        calculatedCo2eRaw: string;
        emissionFactor: { id: string; factorKgCo2ePerUnit: string };
      };
    };
    assert.equal(createdCarBody.activity.calculatedCo2eRaw, '3.570000');
    assert.equal(createdCarBody.activity.calculatedCo2e, 3.57);
    const carLogId = createdCarBody.activity.id;
    const originalCarFactorId = createdCarBody.activity.emissionFactor.id;

    // 6. Create Electricity Consumption activity (120 kWh * 0.72700000 = 87.240000 kg CO2e)
    const createElecRes = await fetch(`${baseUrl}/api/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: electricityType.id,
        quantity: '120',
        unit: 'kWh',
        activityDate: '2026-11-12',
      }),
    });
    assert.equal(createElecRes.status, 201);
    const elecBody = (await createElecRes.json()) as {
      activity: { id: string; calculatedCo2eRaw: string };
    };
    assert.equal(elecBody.activity.calculatedCo2eRaw, '87.240000');

    // 7. List filtering, sorting, and pagination
    const filterEnergyRes = await fetch(`${baseUrl}/api/activities?category=Energy&sort=emissions_desc`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(filterEnergyRes.status, 200);
    const filterEnergyBody = (await filterEnergyRes.json()) as {
      items: Array<{ id: string; category: string }>;
      total: number;
    };
    assert.equal(filterEnergyBody.total, 1);
    assert.equal(filterEnergyBody.items[0].category, 'Energy');

    // 8. Summary aggregation check (3.57 + 87.24 = 90.81 kg CO2e across 2 types)
    const summaryRes = await fetch(`${baseUrl}/api/activities/summary`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(summaryRes.status, 200);
    const summaryBody = (await summaryRes.json()) as {
      summary: {
        totalActivities: number;
        totalEmissionsKg: number;
        distinctActivityTypesCount: number;
      };
    };
    assert.equal(summaryBody.summary.totalActivities, 2);
    assert.equal(summaryBody.summary.distinctActivityTypesCount, 2);
    assert.ok(Math.abs(summaryBody.summary.totalEmissionsKg - 90.81) < 0.0001);

    // 9. Update quantity ONLY preserves original emission_factor_id and recalculates CO2e
    const updateCarRes = await fetch(`${baseUrl}/api/activities/${carLogId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: carType.id,
        quantity: '50',
        unit: 'km',
        activityDate: '2026-11-10',
      }),
    });
    assert.equal(updateCarRes.status, 200);
    const updatedCarBody = (await updateCarRes.json()) as {
      activity: {
        calculatedCo2eRaw: string;
        emissionFactor: { id: string };
      };
    };
    assert.equal(updatedCarBody.activity.emissionFactor.id, originalCarFactorId);
    assert.equal(updatedCarBody.activity.calculatedCo2eRaw, '7.000000');

    // 10. Cross-user ownership enforcement: User B cannot view, edit, or delete User A's activity
    const userBView = await fetch(`${baseUrl}/api/activities/${carLogId}`, {
      headers: { Cookie: userB.cookie },
    });
    assert.equal(userBView.status, 404);

    const userBEdit = await fetch(`${baseUrl}/api/activities/${carLogId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userB.csrfToken,
        Cookie: userB.cookie,
      },
      body: JSON.stringify({
        activityTypeId: carType.id,
        quantity: '1',
        activityDate: '2026-11-10',
      }),
    });
    assert.equal(userBEdit.status, 404);

    const userBDelete = await fetch(`${baseUrl}/api/activities/${carLogId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': userB.csrfToken,
        Cookie: userB.cookie,
      },
    });
    assert.equal(userBDelete.status, 404);

    // 11. User A deletes their own activity and verifies deletion
    const deleteRes = await fetch(`${baseUrl}/api/activities/${carLogId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
    });
    assert.equal(deleteRes.status, 200);

    const afterDeleteView = await fetch(`${baseUrl}/api/activities/${carLogId}`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(afterDeleteView.status, 404);
  } finally {
    await getPool().query('DELETE FROM users WHERE email = ANY($1)', [[userAEmail, userBEmail]]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabasePool();
  }
});

test('Phase 4 Analytics API: aggregations, leap years, year boundaries, zero-comparisons, goal progress, isolation, and live mutation sync', { skip: SKIP_REASON }, async () => {
  await runMigrations();
  await seedEmissionFactors();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const userAEmail = `phase4_a_${Date.now()}@ecotrack.test`;
  const userBEmail = `phase4_b_${Date.now()}@ecotrack.test`;

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const userA = await createAuthenticatedUserSession(baseUrl, 'Analytics User A', userAEmail);
    const userB = await createAuthenticatedUserSession(baseUrl, 'Analytics User B', userBEmail);

    const typesRes = await fetch(`${baseUrl}/api/activity-types`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(typesRes.status, 200);
    const typesBody = (await typesRes.json()) as {
      items: Array<{ id: string; name: string; unit: string }>;
    };
    const carType = typesBody.items.find((t) => t.name === 'Car Travel')!;
    const elecType = typesBody.items.find((t) => t.name === 'Electricity Consumption')!;

    // Seed activities for User A across leap-year Feb 2024, Dec 2025, Jan 2026, and Nov 2026
    const createFor = async (
      session: { cookie: string; csrfToken: string },
      activityTypeId: string,
      quantity: string,
      unit: string,
      activityDate: string
    ) => {
      const res = await fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': session.csrfToken,
          Cookie: session.cookie,
        },
        body: JSON.stringify({ activityTypeId, quantity, unit, activityDate }),
      });
      assert.equal(res.status, 201);
      return (await res.json()) as { activity: { id: string; calculatedCo2e: number } };
    };

    // Leap year Feb 2024: 100 km Car * 0.14 = 14.00 kg
    await createFor(userA, carType.id, '100', 'km', '2024-02-29');
    // Dec 2025: 100 km Car * 0.14 = 14.00 kg
    await createFor(userA, carType.id, '100', 'km', '2025-12-15');
    // Jan 2026: 50 km Car * 0.14 = 7.00 kg (50% reduction vs Dec 2025)
    await createFor(userA, carType.id, '50', 'km', '2026-01-10');
    // Nov 2026: Car 50 km (7.00 kg) + Electricity 100 kWh (72.70 kg) = 79.70 kg
    const novCar = await createFor(userA, carType.id, '50', 'km', '2026-11-05');
    await createFor(userA, elecType.id, '100', 'kWh', '2026-11-12');

    // User B activity in Nov 2026 must NEVER leak into User A's analytics
    await createFor(userB, carType.id, '1000', 'km', '2026-11-05');

    // Insert a monthly goal for User A for 2026-11-01 (100.000 kg CO2e)
    await getPool().query(
      'INSERT INTO monthly_goals (user_id, goal_month, target_co2e) VALUES ($1, $2::date, $3::numeric)',
      [userA.userId, '2026-11-01', '100.000']
    );

    // 1. Invalid filter rejection
    const badFilter = await fetch(`${baseUrl}/api/analytics/overview?year=2026&month=13`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(badFilter.status, 400);

    // 2. Overview for 2026-11 (prior month 2026-10 is 0 => percentageChange null / insufficient_data)
    const novOverviewRes = await fetch(`${baseUrl}/api/analytics/overview?year=2026&month=11`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(novOverviewRes.status, 200);
    const { overview: novOverview } = (await novOverviewRes.json()) as {
      overview: {
        currentMonth: { totalEmissionsKg: number; activityCount: number };
        comparison: { percentageChange: number | null; direction: string; differenceKg: number };
        goal: { targetCo2eKg: number; percentageUsed: number } | null;
        highestCategory: { category: string; totalEmissionsKg: number } | null;
      };
    };
    assert.ok(Math.abs(novOverview.currentMonth.totalEmissionsKg - 79.7) < 0.001);
    assert.equal(novOverview.currentMonth.activityCount, 2);
    assert.equal(novOverview.comparison.percentageChange, null);
    assert.equal(novOverview.comparison.direction, 'insufficient_data');
    assert.ok(novOverview.goal && novOverview.goal.targetCo2eKg === 100);
    assert.ok(Math.abs(novOverview.goal.percentageUsed - 79.7) < 0.2);
    assert.equal(novOverview.highestCategory?.category, 'Energy');

    // 3. Year-boundary overview for Jan 2026 vs Dec 2025 (-50% decrease)
    const janOverviewRes = await fetch(`${baseUrl}/api/analytics/overview?year=2026&month=1`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(janOverviewRes.status, 200);
    const { overview: janOverview } = (await janOverviewRes.json()) as {
      overview: {
        currentMonth: { totalEmissionsKg: number; dailyAverageKg: number };
        comparison: { percentageChange: number | null; direction: string; differenceKg: number };
      };
    };
    assert.equal(janOverview.currentMonth.totalEmissionsKg, 7);
    assert.equal(janOverview.comparison.direction, 'decrease');
    assert.equal(janOverview.comparison.percentageChange, -50);
    assert.equal(janOverview.comparison.differenceKg, -7);

    // 4. 12-month trend includes zero-activity months
    const trend12Res = await fetch(
      `${baseUrl}/api/analytics/monthly-trend?year=2026&month=11&range=12`,
      { headers: { Cookie: userA.cookie } }
    );
    assert.equal(trend12Res.status, 200);
    const { trend: trend12 } = (await trend12Res.json()) as {
      trend: { points: Array<{ monthKey: string; totalEmissionsKg: number }> };
    };
    assert.equal(trend12.points.length, 12);
    assert.equal(trend12.points[0].monthKey, '2025-12');
    assert.equal(trend12.points[0].totalEmissionsKg, 14);
    assert.equal(trend12.points[5].totalEmissionsKg, 0);

    // 5. Daily trend for leap-year Feb 2024 includes all 29 days
    const leapDailyRes = await fetch(
      `${baseUrl}/api/analytics/daily-trend?year=2024&month=2`,
      { headers: { Cookie: userA.cookie } }
    );
    assert.equal(leapDailyRes.status, 200);
    const { dailyTrend: leapDaily } = (await leapDailyRes.json()) as {
      dailyTrend: { points: Array<{ date: string; totalEmissionsKg: number }> };
    };
    assert.equal(leapDaily.points.length, 29);
    assert.equal(leapDaily.points[28].date, '2024-02-29');
    assert.equal(leapDaily.points[28].totalEmissionsKg, 14);
    assert.equal(leapDaily.points[0].totalEmissionsKg, 0);

    // 6. Category breakdown percentages for 2026-11
    const breakdownRes = await fetch(
      `${baseUrl}/api/analytics/category-breakdown?year=2026&month=11`,
      { headers: { Cookie: userA.cookie } }
    );
    assert.equal(breakdownRes.status, 200);
    const { breakdown } = (await breakdownRes.json()) as {
      breakdown: {
        totalEmissionsKg: number;
        categories: Array<{ category: string; totalEmissionsKg: number; percentageShare: number }>;
      };
    };
    assert.ok(Math.abs(breakdown.totalEmissionsKg - 79.7) < 0.001);
    assert.equal(breakdown.categories[0].category, 'Energy');

    // 7. Empty period top-category message
    const emptyTopRes = await fetch(
      `${baseUrl}/api/analytics/top-category?year=2023&month=5`,
      { headers: { Cookie: userA.cookie } }
    );
    assert.equal(emptyTopRes.status, 200);
    const { topCategory: emptyTop } = (await emptyTopRes.json()) as {
      topCategory: { topCategory: unknown; message: string };
    };
    assert.equal(emptyTop.topCategory, null);
    assert.match(emptyTop.message, /Log your first activity/i);

    // 8. Recent activities capped at 5, sorted newest first, User A only
    const recentRes = await fetch(`${baseUrl}/api/analytics/recent-activities?limit=5`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(recentRes.status, 200);
    const recentBody = (await recentRes.json()) as {
      items: Array<{ userId: string; activityDate: string }>;
    };
    assert.equal(recentBody.items.length, 5);
    assert.ok(recentBody.items.every((item) => item.userId === userA.userId));
    assert.equal(recentBody.items[0].activityDate, '2026-11-12');

    // 9. Editing and deleting activity updates analytics totals immediately
    const editRes = await fetch(`${baseUrl}/api/activities/${novCar.activity.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({
        activityTypeId: carType.id,
        quantity: '100',
        unit: 'km',
        activityDate: '2026-11-05',
      }),
    });
    assert.equal(editRes.status, 200);

    const afterEditOverview = await fetch(
      `${baseUrl}/api/analytics/overview?year=2026&month=11`,
      { headers: { Cookie: userA.cookie } }
    );
    const afterEditBody = (await afterEditOverview.json()) as {
      overview: { currentMonth: { totalEmissionsKg: number } };
    };
    assert.ok(Math.abs(afterEditBody.overview.currentMonth.totalEmissionsKg - 86.7) < 0.001);

    const delRes = await fetch(`${baseUrl}/api/activities/${novCar.activity.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': userA.csrfToken, Cookie: userA.cookie },
    });
    assert.equal(delRes.status, 200);

    const afterDelOverview = await fetch(
      `${baseUrl}/api/analytics/overview?year=2026&month=11`,
      { headers: { Cookie: userA.cookie } }
    );
    const afterDelBody = (await afterDelOverview.json()) as {
      overview: { currentMonth: { totalEmissionsKg: number; activityCount: number } };
    };
    assert.ok(Math.abs(afterDelBody.overview.currentMonth.totalEmissionsKg - 72.7) < 0.001);
    assert.equal(afterDelBody.overview.currentMonth.activityCount, 1);
  } finally {
    await getPool().query('DELETE FROM users WHERE email = ANY($1)', [[userAEmail, userBEmail]]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabasePool();
  }
});

test('Phase 5 Goals CRUD, Recommendations, Emission Filters, Monthly Reports, CSV Export, and Profile Settings', { skip: SKIP_REASON }, async () => {
  await runMigrations();
  await seedEmissionFactors();

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const userAEmail = `phase5_a_${Date.now()}@ecotrack.test`;
  const userBEmail = `phase5_b_${Date.now()}@ecotrack.test`;

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const userA = await createAuthenticatedUserSession(baseUrl, 'Phase5 Alpha', userAEmail);
    const userB = await createAuthenticatedUserSession(baseUrl, 'Phase5 Beta', userBEmail);

    // 1. Empty state recommendations + empty CSV export return safe onboarding & header-only CSV
    const emptyRecsRes = await fetch(`${baseUrl}/api/recommendations?year=2026&month=11`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(emptyRecsRes.status, 200);
    const emptyRecs = (await emptyRecsRes.json()) as {
      recommendations: Array<{ id: string }>;
    };
    assert.ok(emptyRecs.recommendations.some((r) => r.id === 'onboarding-01'));

    const emptyCsvRes = await fetch(`${baseUrl}/api/reports/export`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(emptyCsvRes.status, 200);
    assert.match(emptyCsvRes.headers.get('content-type') || '', /^text\/csv/i);
    const emptyCsvText = await emptyCsvRes.text();
    assert.ok(emptyCsvText.startsWith('\uFEFFActivity Date,Category,Activity Type'));

    // 2. Seed activities for User A (Car 100 km = 14.00 kg, Electricity 100 kWh = 72.70 kg -> total 86.70 kg)
    const typesRes = await fetch(`${baseUrl}/api/activity-types`, {
      headers: { Cookie: userA.cookie },
    });
    const typesBody = (await typesRes.json()) as {
      items: Array<{ id: string; name: string; unit: string }>;
    };
    const carType = typesBody.items.find((t) => t.name === 'Car Travel')!;
    const elecType = typesBody.items.find((t) => t.name === 'Electricity Consumption')!;

    for (const entry of [
      { type: carType, qty: '100', date: '2026-11-05' },
      { type: elecType, qty: '100', date: '2026-11-12' },
    ]) {
      const r = await fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': userA.csrfToken,
          Cookie: userA.cookie,
        },
        body: JSON.stringify({
          activityTypeId: entry.type.id,
          quantity: entry.qty,
          unit: entry.type.unit,
          activityDate: entry.date,
        }),
      });
      assert.equal(r.status, 201);
    }

    // 3. Goals CRUD: create 50 kg target for 2026-11 -> >100% TARGET_EXCEEDED (173.4%)
    const createGoalRes = await fetch(`${baseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({ goalMonth: '2026-11', targetCo2e: '50' }),
    });
    assert.equal(createGoalRes.status, 201);
    const createdGoalBody = (await createGoalRes.json()) as {
      goal: {
        id: string;
        progress: { status: string; usagePercentage: number };
      };
    };
    const goalId = createdGoalBody.goal.id;
    assert.equal(createdGoalBody.goal.progress.status, 'TARGET_EXCEEDED');
    assert.ok(createdGoalBody.goal.progress.usagePercentage > 170);

    // Duplicate goal month rejected with 409 Conflict
    const dupGoalRes = await fetch(`${baseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({ goalMonth: '2026-11', targetCo2e: '200' }),
    });
    assert.equal(dupGoalRes.status, 409);

    // Ownership isolation: User B cannot update or delete User A's goal
    const userBEditGoal = await fetch(`${baseUrl}/api/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userB.csrfToken,
        Cookie: userB.cookie,
      },
      body: JSON.stringify({ goalMonth: '2026-11', targetCo2e: '500' }),
    });
    assert.equal(userBEditGoal.status, 404);

    // Recommendations reflect Energy highest + Target Exceeded
    const recsRes = await fetch(`${baseUrl}/api/recommendations?year=2026&month=11`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(recsRes.status, 200);
    const recsBody = (await recsRes.json()) as {
      recommendations: Array<{ id: string }>;
    };
    assert.ok(recsBody.recommendations.some((r) => r.id === 'energy-01'));
    assert.ok(recsBody.recommendations.some((r) => r.id === 'goal-exceeded-01'));

    // Update goal to 150 kg -> WITHIN_TARGET
    const updateGoalRes = await fetch(`${baseUrl}/api/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({ goalMonth: '2026-11', targetCo2e: '150' }),
    });
    assert.equal(updateGoalRes.status, 200);

    const currentGoalRes = await fetch(`${baseUrl}/api/goals/current?year=2026&month=11`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(currentGoalRes.status, 200);
    const currentGoalBody = (await currentGoalRes.json()) as {
      progress: { status: string };
    };
    assert.equal(currentGoalBody.progress.status, 'WITHIN_TARGET');

    // 4. Advanced minEmissions / maxEmissions filters on activities + summary
    const filteredListRes = await fetch(
      `${baseUrl}/api/activities?minEmissions=20&maxEmissions=100`,
      { headers: { Cookie: userA.cookie } }
    );
    assert.equal(filteredListRes.status, 200);
    const filteredListBody = (await filteredListRes.json()) as {
      items: Array<{ activityTypeName: string }>;
      total: number;
    };
    assert.equal(filteredListBody.total, 1);
    assert.equal(filteredListBody.items[0].activityTypeName, 'Electricity Consumption');

    // 5. Monthly Report & Filtered CSV Export
    const monthlyReportRes = await fetch(`${baseUrl}/api/reports/monthly?year=2026&month=11`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(monthlyReportRes.status, 200);
    const reportBody = (await monthlyReportRes.json()) as {
      report: { disclaimer: string; summary: { totalEmissionsKg: number } };
    };
    assert.match(reportBody.report.disclaimer, /Estimated emissions from your recorded activities/i);
    assert.ok(Math.abs(reportBody.report.summary.totalEmissionsKg - 86.7) < 0.001);

    const csvExportRes = await fetch(
      `${baseUrl}/api/reports/export?startDate=2026-11-01&endDate=2026-11-30&minEmissions=20`,
      { headers: { Cookie: userA.cookie } }
    );
    assert.equal(csvExportRes.status, 200);
    assert.match(
      csvExportRes.headers.get('content-disposition') || '',
      /ecotrack-emissions-2026-11\.csv/
    );
    const csvText = await csvExportRes.text();
    assert.match(csvText, /Electricity Consumption/);
    assert.doesNotMatch(csvText, /Car Travel/);

    // 6. Profile GET & PUT persistence
    const putProfileRes = await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': userA.csrfToken,
        Cookie: userA.cookie,
      },
      body: JSON.stringify({ fullName: 'Phase5 Updated Name' }),
    });
    assert.equal(putProfileRes.status, 200);

    const getProfileRes = await fetch(`${baseUrl}/api/profile`, {
      headers: { Cookie: userA.cookie },
    });
    assert.equal(getProfileRes.status, 200);
    const profileBody = (await getProfileRes.json()) as {
      user: { fullName: string; password_hash?: string };
    };
    assert.equal(profileBody.user.fullName, 'Phase5 Updated Name');
    assert.equal(profileBody.user.password_hash, undefined);

    // 7. Delete goal cleanly
    const delGoalRes = await fetch(`${baseUrl}/api/goals/${goalId}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': userA.csrfToken, Cookie: userA.cookie },
    });
    assert.equal(delGoalRes.status, 200);
  } finally {
    await getPool().query('DELETE FROM users WHERE email = ANY($1)', [[userAEmail, userBEmail]]);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabasePool();
  }
});

