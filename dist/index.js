import { isZodError, parseZodError } from "./parsers/zod.js";
import { isPrismaError, parsePrismaError } from "./parsers/prisma.js";
import { parseGenericError } from "./parsers/generic.js";
import { formatEnhancedError } from "./formatter.js";
/**
 * Parses a thrown error and returns a structured EnhancedError object.
 * Use this when you want to process the result yourself.
 */
export function parse(err) {
    if (isZodError(err))
        return parseZodError(err);
    if (isPrismaError(err))
        return parsePrismaError(err);
    return parseGenericError(err);
}
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
export function enhance(err) {
    const enhanced = parse(err);
    process.stderr.write(formatEnhancedError(enhanced));
    return err;
}
/**
 * Wraps an async function so any thrown error is automatically enhanced.
 *
 * @example
 * const safeRun = withEnhance(async () => {
 *   await riskyOperation();
 * });
 * await safeRun();
 */
export function withEnhance(fn) {
    return async () => {
        try {
            return await fn();
        }
        catch (err) {
            throw enhance(err);
        }
    };
}
