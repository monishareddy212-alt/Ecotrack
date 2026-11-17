import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCarbonEmissions,
  parsePositiveDecimalString,
} from './carbonCalculator';

test('parsePositiveDecimalString validates positive decimals and scale limits', () => {
  assert.equal(parsePositiveDecimalString('10'), '10');
  assert.equal(parsePositiveDecimalString('14.255'), '14.255');
  assert.equal(parsePositiveDecimalString(25.5), '25.5');
  assert.equal(parsePositiveDecimalString('0'), null);
  assert.equal(parsePositiveDecimalString('-5'), null);
  assert.equal(parsePositiveDecimalString('1.2345', 3), null);
  assert.equal(parsePositiveDecimalString('abc'), null);
  assert.equal(parsePositiveDecimalString(Infinity), null);
});

test('calculateCarbonEmissions computes exact fixed-point products without floating-point drift', () => {
  // Classic IEEE-754 trap: 0.1 * 0.2 = 0.020000000000000004 in JS floats
  assert.equal(calculateCarbonEmissions('0.1', '0.2'), '0.020000');

  // Illustrative example: 10 km * 0.20 = 2.000000 kg CO2e
  assert.equal(calculateCarbonEmissions('10', '0.20'), '2.000000');

  // India CEA electricity factor: 125.5 kWh * 0.727 = 91.238500 kg CO2e
  assert.equal(calculateCarbonEmissions('125.5', '0.72700000'), '91.238500');

  // IPCC LPG factor: 14.2 kg * 2.98463 = 42.381746 kg CO2e
  assert.equal(calculateCarbonEmissions('14.2', '2.98463000'), '42.381746');

  // Half-up rounding at 7th decimal place: 1 * 0.1234565 -> 0.123457
  assert.equal(calculateCarbonEmissions('1', '0.1234565'), '0.123457');
});
