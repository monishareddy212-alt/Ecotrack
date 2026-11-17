import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePgSslConfig } from '../config/env';
import { generateCsrfToken, tokensMatch } from '../middleware/csrf';
import {
  normalizeEmail,
  validateLoginPayload,
  validateProfileUpdatePayload,
  validateRegisterPayload,
} from './validation';

test('normalizeEmail trims whitespace and lowercases characters', () => {
  assert.equal(normalizeEmail('  Ananya.Sharma@EcoTrack.EDU  '), 'ananya.sharma@ecotrack.edu');
});

test('validateRegisterPayload validates required fields, password length, and confirmation', () => {
  const invalid = validateRegisterPayload({
    fullName: 'A',
    email: 'not-an-email',
    password: 'short',
    confirmPassword: 'different',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);
  assert.ok(invalid.errors.confirmPassword);

  const valid = validateRegisterPayload({
    fullName: '  Aarav Patel ',
    email: '  AARAV@Example.com ',
    password: 'StrongPassword123',
    confirmPassword: 'StrongPassword123',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.data?.email, 'aarav@example.com');
  assert.equal(valid.data?.fullName, 'Aarav Patel');
});

test('validateLoginPayload normalizes email and checks password presence', () => {
  const invalid = validateLoginPayload({ email: 'bad', password: '' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);

  const valid = validateLoginPayload({ email: 'USER@Test.org ', password: 'secret123' });
  assert.equal(valid.valid, true);
  assert.equal(valid.data?.email, 'user@test.org');
});

test('validateProfileUpdatePayload enforces non-empty fullName length', () => {
  assert.equal(validateProfileUpdatePayload({ fullName: ' ' }).valid, false);
  assert.equal(validateProfileUpdatePayload({ fullName: 'Riya Nair' }).valid, true);
});

test('resolvePgSslConfig enables strict SSL for Neon URLs and disables for localhost', () => {
  assert.deepEqual(
    resolvePgSslConfig('mysql://u:p@ep-cool-sky.us-east-2.aws.neon.tech:3306/neondb?sslmode=require'),
    { rejectUnauthorized: true }
  );
  assert.equal(
    resolvePgSslConfig('mysql://root:root@localhost:3306/ecotrack'),
    false
  );
  assert.equal(
    resolvePgSslConfig('mysql://u:p@host:3306/db', 'false'),
    false
  );
  assert.deepEqual(
    resolvePgSslConfig('mysql://u:p@dpg-c1234567890-a:3306/ecotrack_db'),
    { rejectUnauthorized: false }
  );
  assert.deepEqual(
    resolvePgSslConfig('mysql://u:p@dpg-c1234567890-a.oregon-postgres.render.com/ecotrack_db'),
    { rejectUnauthorized: false }
  );
});

test('CSRF token generation and timing-safe matching work as expected', () => {
  const token = generateCsrfToken();
  assert.equal(token.length, 64);
  assert.equal(tokensMatch(token, token), true);
  assert.equal(tokensMatch(token, 'wrong-token'), false);
});
