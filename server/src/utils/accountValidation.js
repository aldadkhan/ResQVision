const isValidName = value =>
  typeof value === 'string' &&
  value.length <= 80 &&
  /^\p{L}+(?:\s+\p{L}+)*$/u.test(value);

const isValidEmail = value =>
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

const isStrongPassword = value =>
  typeof value === 'string' &&
  value.length >= 8 &&
  /\p{L}/u.test(value) &&
  /\d/.test(value) &&
  /[^\p{L}\d\s]/u.test(value);

module.exports = { isValidName, isValidEmail, isStrongPassword };
