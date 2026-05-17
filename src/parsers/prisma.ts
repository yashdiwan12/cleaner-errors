import type { EnhancedError } from "../types.js";

// Prisma error codes and their plain-English meanings
const PRISMA_CODES: Record<string, { what: string; fix: string }> = {
  P2002: {
    what: "A record with this value already exists. The field must be unique across the table.",
    fix: `Check for an existing record before inserting:\nconst existing = await prisma.<model>.findUnique({ where: { <field> } });\nif (existing) throw new Error("Already exists");`,
  },
  P2003: {
    what: "A related record doesn't exist. You're referencing a foreign key that has no matching row.",
    fix: `Make sure the related record exists first:\nconst parent = await prisma.<parent>.findUnique({ where: { id } });\nif (!parent) throw new Error("Parent not found");`,
  },
  P2025: {
    what: "The record you tried to update or delete was not found in the database.",
    fix: `Use findFirst before updating:\nconst record = await prisma.<model>.findUnique({ where: { id } });\nif (!record) throw new Error("Not found");`,
  },
  P2016: {
    what: "Query interpretation error — the query is referencing a field or relation that doesn't exist in the schema.",
    fix: `Re-run \`npx prisma generate\` to sync your client with the latest schema.`,
  },
  P1001: {
    what: "Cannot reach the database server. The connection was refused or timed out.",
    fix: `Check that your DATABASE_URL is correct and the database is running:\nnpx prisma db ping`,
  },
};

export function isPrismaError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as any).constructor?.name?.startsWith("PrismaClient")
  );
}

export function parsePrismaError(err: unknown): EnhancedError {
  const e = err as any;
  const code: string = e.code ?? "UNKNOWN";
  const meta = e.meta ?? {};
  const known = PRISMA_CODES[code];

  const fields: string[] = meta.target
    ? Array.isArray(meta.target)
      ? meta.target
      : [meta.target]
    : meta.field_name
    ? [meta.field_name]
    : [];

  const what = known
    ? known.what +
      (fields.length ? `\n  Affected field(s): ${fields.join(", ")}` : "")
    : `Prisma error ${code}: ${e.message}`;

  const fix = known?.fix ?? "Check the Prisma error reference for details.";

  return {
    source: "Prisma",
    type: e.constructor?.name ?? "PrismaError",
    what,
    fields,
    fix,
    docs: `https://www.prisma.io/docs/reference/api-reference/error-reference#${code.toLowerCase()}`,
  };
}
