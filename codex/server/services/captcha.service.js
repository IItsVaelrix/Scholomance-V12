
import crypto from 'crypto';

export class CaptchaService {
  constructor() {}

  /**
   * Generates a simple math challenge.
   * @returns {Object} { id, challenge, solution }
   */
  generateChallenge() {
    const num1 = crypto.randomInt(1, 11);
    const num2 = crypto.randomInt(1, 11);
    const operators = ['+', '*'];
    const operator = operators[crypto.randomInt(0, operators.length)];
    
    let solution = 0;
    if (operator === '+') solution = num1 + num2;
    if (operator === '*') solution = num1 * num2;

    const id = crypto.randomUUID();
    return {
      id,
      text: `What is ${num1} ${operator} ${num2}?`,
      solution: solution.toString()
    };
  }

  /**
   * Validates the captcha response against the session stored value.
   * @param {string} input - User's answer.
   * @param {string} expected - Stored expected answer.
   * @returns {boolean}
   */
  validate(input, expected) {
    if (input === undefined || input === null || expected === undefined || expected === null) return false;
    return String(input).trim() === String(expected).trim();
  }
}

export const captchaService = new CaptchaService();
