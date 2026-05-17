# cleaner-errors

**Your Node.js errors are lying to you.**

Not intentionally. But when Zod throws a wall of JSON, when Prisma says `P2002` like you're supposed to know what that means, when TypeScript runtime explodes with `Cannot read properties of undefined (reading 'map')` — you're not getting an error. You're getting a puzzle.

`cleaner-errors` wraps your run command and translates that noise into plain English. No config. No code changes. One prefix.

```bash
npm install -g cleaner-errors
```

---

## Before / After

**Before** — what you're dealing with today:

```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["user", "email"],
    "message": "Required"
  },
  {
    "code": "too_small",
    "minimum": 8,
    "type": "string",
    "path": ["user", "password"],
    "message": "String must contain at least 8 character(s)"
  }
]
```

**After** — what you actually need:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📦 Zod  ›  ZodError
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What went wrong
  2 fields failed validation:
  • user.email: Expected string, got undefined
  • user.password: Must be at least 8 character(s)

Affected field(s)
  ◆ user.email
  ◆ user.password

Suggested fix
  Make sure your input payload includes all required properties:
  user.email: <valid value>

Documentation
  → [https://zod.dev/ERROR_HANDLING](https://zod.dev/ERROR_HANDLING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Same error. Ten seconds instead of ten minutes.

---

## Usage

Just prefix your existing run command. That's it.

```bash
# node
cleaner-errors node server.js

# tsx / ts-node
cleaner-errors npx tsx src/index.ts
cleaner-errors ts-node src/index.ts

# bun
cleaner-errors bun run src/index.ts

# anything, really
cleaner-errors npx whatever src/index.ts
```

No wrapping your code. No `try/catch` boilerplate. No setup. It intercepts stderr, recognises the error, and tells you what went wrong.

---

## What it catches

| Library | Errors |
|---|---|
| **Zod** | Every issue code — `invalid_type`, `too_small`, `too_big`, `invalid_enum_value`, and more. Shows every failing field at once. |
| **Prisma** | `P2002` unique constraint, `P2003` foreign key, `P2025` record not found, `P2016` query error, `P1001` can't reach database |
| **Node.js** | `Cannot read properties of undefined`, `is not a function`, fetch failures, `Maximum call stack size exceeded`, `MODULE_NOT_FOUND` |

tRPC parser shipping in v0.2.

---

## Programmatic API

Prefer dropping it into your own code? That works too.

```ts
import { enhance, parse, withEnhance } from 'cleaner-errors';
```

**`enhance(err)`** — print + re-throw. Drop it in any catch block:

```ts
try {
  await createUser(input);
} catch (err) {
  throw enhance(err); // prints the good stuff, re-throws the original
}
```

**`withEnhance(fn)`** — wrap a whole function:

```ts
const start = withEnhance(async () => {
  await server.listen(3000);
});

await start();
```

**`parse(err)`** — just give me the data, I'll handle the output:

```ts
try {
  await createUser(input);
} catch (err) {
  const info = parse(err);

  logger.error({
    source: info.source,   // "Zod"
    what:   info.what,     // plain-English explanation
    fields: info.fields,   // ["user.email", "user.password"]
    fix:    info.fix,      // suggested fix
    docs:   info.docs,     // link to docs
  });
}
```

---

## Options

```bash
cleaner-errors --help      # usage
cleaner-errors --version   # version
```

Set `NO_COLOR=1` to strip ANSI — useful for log files, CI, or piping output somewhere.

---

## Why not just read the error?

You can. But you shouldn't have to spend 5 minutes cross-referencing Prisma's error reference docs to find out that `P2002` means "that email already exists." Or parsing a Zod issue array by hand to figure out which of your 12 fields failed validation. Or googling `Cannot read properties of undefined` for the fourth time this week.

These are solved problems. The libraries know exactly what went wrong. They just don't tell you clearly. `cleaner-errors` is the translation layer.

---

## Contributing

Parsers are small, self-contained, and easy to add. If your favourite library throws cryptic errors, open a PR.

Each parser is two functions:

```ts
// src/parsers/mylibrary.ts

export function isMyLibraryError(err: unknown): boolean {
  return (err as any)?.name === 'MyLibraryError';
}

export function parseMyLibraryError(err: unknown): EnhancedError {
  return {
    source: 'MyLibrary',
    type:   'MyLibraryError',
    what:   'Plain-English explanation.',
    fields: ['the.affected.field'],
    fix:    'What to do about it, with a code snippet.',
    docs:   'https://mylibrary.dev/errors',
  };
}
```

Register it in `src/index.ts` and you're done.

```bash
git clone https://github.com/yashdiwan12/cleaner-errors
cd cleaner-errors
npm install
npm run dev
```

---
