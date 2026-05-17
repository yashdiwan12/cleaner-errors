import type { EnhancedError } from "./types.js";
export type { EnhancedError };
/**
 * Parses a thrown error and returns a structured EnhancedError object.
 * Use this when you want to process the result yourself.
 */
export declare function parse(err: unknown): EnhancedError;
/**
 * Parses and prints a human-readable error to stderr, then re-throws.
 * Drop this into any try/catch — zero config required.
 *
 * @example
 * try {
 *   await myOperation();
 * } catch (err) {
 *   throw enhance(err);
 * }
 */
export declare function enhance(err: unknown): unknown;
/**
 * Wraps an async function so any thrown error is automatically enhanced.
 *
 * @example
 * const safeRun = withEnhance(async () => {
 *   await riskyOperation();
 * });
 * await safeRun();
 */
export declare function withEnhance<T>(fn: () => Promise<T>): () => Promise<T>;
