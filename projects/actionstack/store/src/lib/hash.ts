/**
 * Generates a random string of a specified length in base-36 (including digits and lowercase letters).
 *
 * @param {number} length  - The desired length of the random string.
 * @returns {string}       - A random base-36 string of the provided length.
 */
export function salt(length: number) {
  return Math.random().toString(36).substring(2).padStart(length, "0").slice(0, length);
}

/**
 * Creates a simple 3-character hash of a string using a basic multiplication-based algorithm.
 *
 * @param {string} str - The string to be hashed.
 * @returns {string}   - A 3-character base-36 string representing the hash of the input string.
 */
export function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = 31 * h + str.charCodeAt(i);
  }
  // Convert to base-36 string and pad with zeros
  let hash = h.toString(36).padStart(3, "0");
  // Return the first 3 characters of the hash
  return hash.slice(0, 3);
}

/**
 * Generates a signature by combining a random salt and a 3-character hash of the salt, separated by dots.
 *
 * @returns {string} - A string containing the salt and its hash separated by dots (e.g., "abc.def").
 */
export function signature() {
  let payload = salt(7), hashstr = hash(payload);
  return payload.concat(hashstr).split('').join('.');
}

/**
 * Validates a provided signature string based on its format and internal hash check.
 *
 * @param {string} sign  - The signature string to be validated.
 * @returns {boolean}    - True if the signature is a valid format and the internal hash check passes, false otherwise.
 */
export function isValidSignature(sign: string) {
  return typeof sign === 'string' && (sign = sign.replace(/\./g, '')).length === 10 && hash(sign.slice(0, 7)) === sign.slice(7, 10);
}
