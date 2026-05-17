import type { EnhancedError } from "../types.js";
export declare function isPrismaError(err: unknown): boolean;
export declare function parsePrismaError(err: unknown): EnhancedError;
