/**
 * Generates a random string of a specified length in base-36 (including digits and lowercase letters).
 *
 * @param {number} length  - The desired length of the random string.
 * @returns {string}       - A random base-36 string of the provided length.
 */
export declare function salt(length: number): string;
/**
 * Creates a simple 3-character hash of a string using a basic multiplication-based algorithm.
 *
 * @param {string} str - The string to be hashed.
 * @returns {string}   - A 3-character base-36 string representing the hash of the input string.
 */
export declare function hash(str: string): string;
/**
 * Generates a signature by combining a random salt and a 3-character hash of the salt, separated by dots.
 *
 * @returns {string} - A string containing the salt and its hash separated by dots (e.g., "abc.def").
 */
export declare function signature(): string;
/**
 * Validates a provided signature string based on its format and internal hash check.
 *
 * @param {string} sign  - The signature string to be validated.
 * @returns {boolean}    - True if the signature is a valid format and the internal hash check passes, false otherwise.
 */
export declare function isValidSignature(sign: string): boolean;
