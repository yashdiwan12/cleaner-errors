import type { EnhancedError } from "../types.js";

interface GenericPattern {
  match: RegExp;
  what: (m: RegExpMatchArray) => string;
  fix: string;
  docs: string;
}

const PATTERNS: GenericPattern[] = [
  {
    match: /Cannot read propert(?:y|ies) of (undefined|null) \(reading '(.+?)'\)/,
    what: ([, nullish, prop]) =>
      `You called .${prop} on a value that was ${nullish} at runtime. The variable wasn't populated before you used it.`,
    fix: `Add a null guard:\nconst value = data?.${`<prop>`} ?? <fallback>;\n// or check before use:\nif (!data) throw new Error("data is missing");`,
    docs: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_access_property",
  },
  {
    match: /(\w+) is not a function/,
    what: ([, name]) =>
      `"${name}" is not a function at this point — it may be undefined, null, or a different type than expected.`,
    fix: `Check what "${`<name>`}" resolves to at runtime:\nconsole.log(typeof ${`<name>`}); // should be "function"`,
    docs: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_a_function",
  },
  {
    match: /fetch failed|ECONNREFUSED|ENOTFOUND/,
    what: () =>
      "A network request failed. The target server is unreachable, the URL is wrong, or there's no internet connection.",
    fix: `Verify the URL and that the server is up:\ncurl <your-url>\n// Also check for typos in environment variables like NEXT_PUBLIC_API_URL`,
    docs: "https://nodejs.org/api/errors.html#common-system-errors",
  },
  {
    match: /Maximum call stack size exceeded/,
    what: () =>
      "A function is calling itself recursively without ever hitting a base case, causing a stack overflow.",
    fix: `Find the recursive function and add a termination condition:\nfunction recurse(n) {\n  if (n <= 0) return; // ← base case\n  recurse(n - 1);\n}`,
    docs: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion",
  },
];

export function parseGenericError(err: unknown): EnhancedError {
  const e = err as Error;
  const msg = e.message ?? String(err);

  for (const pattern of PATTERNS) {
    const m = msg.match(pattern.match);
    if (m) {
      return {
        source: "Node.js",
        type: e.name ?? "Error",
        what: pattern.what(m as RegExpMatchArray),
        fields: extractLocationFromStack(e.stack),
        fix: pattern.fix,
        docs: pattern.docs,
      };
    }
  }

  // Fallback: no pattern matched, still format nicely
  return {
    source: "Node.js",
    type: e.name ?? "Error",
    what: msg,
    fields: extractLocationFromStack(e.stack),
    fix: "Review the stack trace above to find where this originated.",
    docs: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error",
  };
}

function extractLocationFromStack(stack?: string): string[] {
  if (!stack) return [];
  const lines = stack.split("\n").slice(1);
  const appLine = lines.find(
    (l) =>
      l.includes("at ") &&
      !l.includes("node_modules") &&
      !l.includes("node:internal")
  );
  if (!appLine) return [];
  // Extract "file.ts:line:col" from the stack frame
  const match = appLine.match(/\((.+?:\d+:\d+)\)/) ?? appLine.match(/at (.+?:\d+:\d+)/);
  return match ? [match[1].replace(process.cwd() + "/", "")] : [];
}
