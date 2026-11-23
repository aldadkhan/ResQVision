const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail, isValidName, isStrongPassword } = require('./accountValidation');

test('name validation accepts letter-only names and rejects punctuation or digits', () => {
  assert.equal(isValidName('Amina Noor'), true);
  assert.equal(isValidName('Élodie'), true);
  assert.equal(isValidName('Amina2'), false);
  assert.equal(isValidName('Amina-Noor'), false);
});

test('email validation requires an address and domain', () => {
  assert.equal(isValidEmail('rescue@example.org'), true);
  assert.equal(isValidEmail('rescue@localhost'), false);
});

test('password validation requires length, letters, digits and punctuation', () => {
  assert.equal(isStrongPassword('Rescue#24'), true);
  assert.equal(isStrongPassword('Rescue24'), false);
  assert.equal(isStrongPassword('Rescue##'), false);
  assert.equal(isStrongPassword('R#2short'), true);
  assert.equal(isStrongPassword('R#2s'), false);
});
