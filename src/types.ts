export interface EnhancedError {
  source: string;    // "Zod" | "Prisma" | "Node.js" | ...
  type: string;      // Original error class name
  what: string;      // Plain-English explanation
  fields: string[];  // Affected fields or file locations
  fix: string;       // Suggested fix with code example
  docs: string;      // Link to relevant docs
}
