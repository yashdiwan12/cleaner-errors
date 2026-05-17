# cleaner-errors

Human-readable error messages for Node.js and TypeScript projects.

Wraps your run command and translates cryptic Zod, Prisma, and runtime errors into plain English — with the affected field, a suggested fix, and a docs link. No changes to your codebase required.

```bash
npm install -g cleaner-errors
```

---

## CLI

Replace `node` (or `ts-node`, `tsx`, `bun`) with `cleaner-errors`:

```bash
# Before
node server.js
npx tsx src/index.ts

# After
cleaner-errors node server.js
cleaner-errors npx tsx src/index.ts
cleaner-errors ts-node src/index.ts
cleaner-errors bun run src/index.ts
```

### Example output

Before — what Node gives you today:

```
ZodError: [
  { "code": "invalid_type", "expected": "string",
    "received": "undefined", "path": ["user","email"], "message": "Required" }
]
```

After — what cleaner-errors gives you:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Zod  ZodError
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What went wrong
  The field "user.email" failed validation: Expected string, got undefined.

Affected field(s)
  ◆ user.email

Suggested fix
  Make sure your input includes all required fields:
  user.email: <valid value>

docs → zod.dev/ERROR_HANDLING
```

---

## Programmatic API

```ts
import { enhance, parse, withEnhance } from 'cleaner-errors';

// Drop into any try/catch — prints enhanced output, re-throws original
try {
  await myOperation();
} catch (err) {
  throw enhance(err);
}

// Wrap an entire async function
const safeRun = withEnhance(async () => {
  await riskyOperation();
});

// Or just parse and handle yourself
try {
  await myOperation();
} catch (err) {
  const info = parse(err);
  // info.source  → "Zod"
  // info.what    → plain-English explanation
  // info.fields  → ["user.email"]
  // info.fix     → suggested fix with code
  // info.docs    → link to docs
}
```

---

## Supported libraries

| Library | What's detected |
|---|---|
| **Zod** | All ZodError issue codes (invalid_type, too_small, too_big, …) |
| **Prisma** | P2002 (unique), P2003 (foreign key), P2025 (not found), P2016, P1001 |
| **Node.js** | TypeError (undefined.x), fetch failures, stack overflows, ReferenceError |

tRPC support coming in v0.2.

---

## Options

| Flag | Description |
|---|---|
| `--help`, `-h` | Show usage |
| `--version`, `-v` | Show version |

| Env var | Description |
|---|---|
| `NO_COLOR=1` | Strip ANSI colors — useful for log files and CI |

---

## License

MIT
