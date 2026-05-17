#!/usr/bin/env node
/**
 * cleaner-errors CLI
 *
 * Usage:
 *   cleaner-errors node server.js
 *   cleaner-errors ts-node src/index.ts
 *   cleaner-errors npx tsx src/index.ts
 *   cleaner-errors --help
 */
import { execa } from "execa";
import chalk from "chalk";
import { parse } from "./index.js";
import { formatEnhancedError } from "./formatter.js";
const args = process.argv.slice(2);
// ─── Help ────────────────────────────────────────────────────────────────────
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
${chalk.bold("cleaner-errors")} — human-readable errors for Node.js / TypeScript projects

${chalk.bold("Usage")}
  cleaner-errors <command> [args]

${chalk.bold("Examples")}
  cleaner-errors node server.js
  cleaner-errors ts-node src/index.ts
  cleaner-errors npx tsx src/index.ts
  cleaner-errors bun run src/index.ts

${chalk.bold("Options")}
  --help, -h     Show this help message
  --version, -v  Show version

${chalk.bold("Environment")}
  NO_COLOR=1     Disable colored output (e.g. for log files)

${chalk.dim("Supports: Zod · Prisma · tRPC · TypeError · ReferenceError · fetch errors")}
`);
    process.exit(0);
}
// ─── Version ─────────────────────────────────────────────────────────────────
if (args[0] === "--version" || args[0] === "-v") {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json");
    console.log(pkg.version);
    process.exit(0);
}
// ─── Run the target process ───────────────────────────────────────────────────
const [bin, ...rest] = args;
// Resolve shorthands: "node" → "node", "tsx" → "npx tsx", etc.
const resolvedBin = resolveBin(bin);
console.log(chalk.dim(`» cleaner-errors running: ${[resolvedBin, ...rest].join(" ")}\n`));
try {
    await execa(resolvedBin, rest, {
        stdio: ["inherit", "inherit", "pipe"], // capture stderr only
        reject: false, // don't throw on non-zero exit
        all: false,
    }).then(async (result) => {
        // If the process exited cleanly, we're done
        if (result.exitCode === 0) {
            process.exit(0);
        }
        // The process failed — parse stderr for known error patterns
        const rawStderr = result.stderr ?? "";
        if (!rawStderr.trim()) {
            // Nothing on stderr — just propagate the exit code
            process.exit(result.exitCode ?? 1);
        }
        // Print the raw stderr first (dimmed) so context is preserved
        process.stderr.write("\n" + chalk.dim("── original error ──────────────────────────\n"));
        process.stderr.write(chalk.dim(rawStderr));
        process.stderr.write(chalk.dim("\n────────────────────────────────────────────\n"));
        // Now try to parse a structured error out of the stderr text
        const syntheticError = reconstructError(rawStderr);
        if (syntheticError) {
            const enhanced = parse(syntheticError);
            process.stderr.write(formatEnhancedError(enhanced));
        }
        else {
            // No structured error found — still try generic pattern matching
            const fallback = new Error(rawStderr.split("\n")[0]);
            fallback.stack = rawStderr;
            const enhanced = parse(fallback);
            process.stderr.write(formatEnhancedError(enhanced));
        }
        process.exit(result.exitCode ?? 1);
    });
}
catch (err) {
    // execa itself failed (e.g. binary not found)
    const msg = err.message ?? String(err);
    if (msg.includes("ENOENT")) {
        console.error(chalk.red(`\nCommand not found: ${chalk.bold(resolvedBin)}`));
        console.error(chalk.dim(`Make sure "${resolvedBin}" is installed and on your PATH.\n`));
    }
    else {
        console.error(chalk.red("\nFailed to start process:"), msg);
    }
    process.exit(1);
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Attempt to reconstruct a typed Error object from raw stderr text.
 * Handles Zod JSON arrays, Prisma error codes, and standard JS errors.
 */
function reconstructError(stderr) {
    // Zod: look for JSON array (thrown as string) OR Node's inline issues: [ { ... } ] format
    const zodJsonMatch = stderr.match(/ZodError[\s\S]*?(\[\s*\{[\s\S]*?"code"\s*:[\s\S]*?\}\s*\])/);
    if (zodJsonMatch) {
        try {
            const issues = JSON.parse(zodJsonMatch[1]);
            const err = new Error("ZodError");
            err.name = "ZodError";
            err.issues = issues;
            return err;
        }
        catch { }
    }
    // Zod: Node.js serializes issues as JS object literal (single quotes, no JSON.parse)
    // Detect by presence of "ZodError" + "issues:" + "code:" in stderr
    if (stderr.includes("ZodError") && stderr.includes("issues:") && stderr.includes("code:")) {
        // Extract individual issues by matching each { code: '...', path: [...], ... } block
        const issueBlocks = [...stderr.matchAll(/\{\s*code:\s*'(\w+)'[\s\S]*?message:\s*'(.+?)'\s*\}/g)];
        if (issueBlocks.length > 0) {
            const pathMatches = [...stderr.matchAll(/path:\s*\[\s*([\s\S]*?)\s*\]/g)];
            const issues = issueBlocks.map((m, i) => {
                const pathRaw = pathMatches[i]?.[1] ?? "";
                const path = pathRaw.match(/'(\w+)'/g)?.map((s) => s.replace(/'/g, "")) ?? [];
                const minMatch = m[0].match(/minimum:\s*(\d+)/);
                return {
                    code: m[1],
                    message: m[2],
                    path,
                    ...(minMatch ? { minimum: +minMatch[1] } : {}),
                    expected: m[0].match(/expected:\s*'(\w+)'/)?.[1],
                    received: m[0].match(/received:\s*'(\w+)'/)?.[1],
                };
            });
            const err = new Error("ZodError");
            err.name = "ZodError";
            err.issues = issues;
            return err;
        }
    }
    // Prisma: look for error code P\d{4}
    const prismaMatch = stderr.match(/code:\s*'(P\d{4})'/);
    if (prismaMatch) {
        const err = new Error(stderr.split("\n")[0]);
        err.constructor = { name: "PrismaClientKnownRequestError" };
        Object.defineProperty(err, "constructor", {
            value: { name: "PrismaClientKnownRequestError" },
        });
        err.code = prismaMatch[1];
        // Try to extract meta.target
        const targetMatch = stderr.match(/target:\s*\[?\s*'(.+?)'\s*\]?/);
        err.meta = targetMatch ? { target: [targetMatch[1]] } : {};
        return err;
    }
    // Standard JS error on first line
    const jsMatch = stderr.match(/^(TypeError|ReferenceError|SyntaxError|Error):\s*(.+)/m);
    if (jsMatch) {
        const err = new globalThis[jsMatch[1]](jsMatch[2]);
        err.stack = stderr;
        return err;
    }
    return null;
}
/**
 * Resolve common shorthand bin names.
 * Users might type "tsx" but need "npx tsx" outside a project script context.
 */
function resolveBin(bin) {
    // These are typically available globally or via npx
    const directBins = ["node", "bun", "deno", "npx", "pnpx"];
    if (directBins.includes(bin))
        return bin;
    return bin;
}
