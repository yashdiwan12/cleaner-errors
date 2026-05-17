import type { EnhancedError } from "../types.js";

interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
  minimum?: number;
  maximum?: number;
}

export function isZodError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as any).name === "ZodError" &&
    Array.isArray((err as any).issues)
  );
}

export function parseZodError(err: unknown): EnhancedError {
  const issues: ZodIssue[] = (err as any).issues;

  const fieldSummaries = issues.map((issue) => {
    const field = issue.path.join(".") || "(root)";
    let detail = "";

    switch (issue.code) {
      case "invalid_type":
        detail = `Expected ${issue.expected}, got ${issue.received}`;
        break;
      case "too_small":
        detail = `Must be at least ${issue.minimum} character(s)`;
        break;
      case "too_big":
        detail = `Must be at most ${issue.maximum} character(s)`;
        break;
      default:
        detail = issue.message;
    }

    return { field, detail };
  });

  const fieldList = fieldSummaries.map((f) => f.field);

  const what =
    fieldSummaries.length === 1
      ? `The field "${fieldSummaries[0].field}" failed validation: ${fieldSummaries[0].detail}.`
      : `${fieldSummaries.length} fields failed validation:\n` +
        fieldSummaries.map((f) => `  • ${f.field}: ${f.detail}`).join("\n");

  const exampleFix = fieldSummaries
    .filter((f) => f.detail.includes("Required") || f.detail.includes("undefined"))
    .map((f) => `  ${f.field}: <valid value>`)
    .join("\n");

  const fix =
    exampleFix
      ? `Make sure your input includes all required fields:\n${exampleFix}`
      : `Check that each field matches the expected type and constraints in your schema.`;

  return {
    source: "Zod",
    type: "ZodError",
    what,
    fields: fieldList,
    fix,
    docs: "https://zod.dev/ERROR_HANDLING",
  };
}
