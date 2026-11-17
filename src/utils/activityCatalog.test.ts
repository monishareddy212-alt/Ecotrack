import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCsvHeaders,
  formatCarbonValue,
  getActivityTypesByCategory,
  getDefaultUnitForActivityType,
  validateActivityForm,
  validateGoalForm,
  validateLoginForm,
  validateRegisterForm,
} from './activityCatalog';

test('getActivityTypesByCategory returns matching activity types only', () => {
  const transport = getActivityTypesByCategory('Transportation');
  assert.deepEqual(
    transport.map((t) => t.name),
    ['Car', 'Motorcycle', 'Bus', 'Metro']
  );

  const energy = getActivityTypesByCategory('Energy');
  assert.deepEqual(
    energy.map((t) => t.name),
    ['Electricity', 'LPG']
  );

  const lifestyle = getActivityTypesByCategory('Lifestyle');
  assert.deepEqual(
    lifestyle.map((t) => t.name),
    ['Plant-Based Meal', 'Meat-Based Meal']
  );
});

test('getDefaultUnitForActivityType maps activity IDs to expected measurement units', () => {
  assert.equal(getDefaultUnitForActivityType('car'), 'km');
  assert.equal(getDefaultUnitForActivityType('electricity'), 'kWh');
  assert.equal(getDefaultUnitForActivityType('lpg'), 'kg');
  assert.equal(getDefaultUnitForActivityType('plant-meal'), 'meals');
  assert.equal(getDefaultUnitForActivityType('unknown'), '');
});

test('validateActivityForm catches missing quantity and mismatched category/type', () => {
  const errors = validateActivityForm({
    category: 'Energy',
    activityTypeId: 'car',
    quantity: '0',
    unit: 'km',
    activityDate: 'invalid',
  });
  assert.ok(errors.activityTypeId);
  assert.ok(errors.quantity);
  assert.ok(errors.activityDate);

  const valid = validateActivityForm({
    category: 'Transportation',
    activityTypeId: 'bus',
    quantity: '14.5',
    unit: 'km',
    activityDate: '2026-11-16',
  });
  assert.deepEqual(valid, {});
});

test('validateLoginForm validates email format and password length', () => {
  const invalid = validateLoginForm({ email: 'bad-email', password: '123' });
  assert.ok(invalid.email);
  assert.ok(invalid.password);

  const valid = validateLoginForm({ email: 'student@ecotrack.edu', password: 'password123' });
  assert.deepEqual(valid, {});
});

test('validateRegisterForm verifies full name, email, password, and matching confirmation', () => {
  const mismatch = validateRegisterForm({
    fullName: 'A',
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password456',
  });
  assert.ok(mismatch.fullName);
  assert.ok(mismatch.confirmPassword);

  const valid = validateRegisterForm({
    fullName: 'Aarav Patel',
    email: 'aarav@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.deepEqual(valid, {});
});

test('validateGoalForm enforces positive numeric target and YYYY-MM month', () => {
  const invalid = validateGoalForm({ monthlyTargetKg: '-10', targetMonth: '2026' });
  assert.ok(invalid.monthlyTargetKg);
  assert.ok(invalid.targetMonth);

  const valid = validateGoalForm({ monthlyTargetKg: '250', targetMonth: '2026-11' });
  assert.deepEqual(valid, {});
});

test('formatCarbonValue and buildCsvHeaders return consistent tabular representations', () => {
  assert.equal(formatCarbonValue(null), '—');
  assert.equal(formatCarbonValue(0), '0.00 kg CO₂e');
  assert.equal(formatCarbonValue(12.345), '12.35 kg CO₂e');
  assert.equal(buildCsvHeaders().length, 6);
});
