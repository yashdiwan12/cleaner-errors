import chalk from "chalk";
const STRIP_ANSI = /\x1B\[[0-9;]*m/g;
const IS_TTY = process.stdout.isTTY;
// Respect NO_COLOR and non-TTY environments
function c(fn, s) {
    return IS_TTY && !process.env.NO_COLOR ? fn(s) : s;
}
export function formatEnhancedError(e) {
    const lines = [];
    const bar = c((s) => chalk.red(s), "━".repeat(56));
    lines.push("");
    lines.push(bar);
    // Header: source badge + type
    const sourceBadge = c((s) => chalk.bgRed.white.bold(s), ` ${e.source} `);
    const typeLabel = c((s) => chalk.red(s), e.type);
    lines.push(`${sourceBadge}  ${typeLabel}`);
    lines.push(bar);
    lines.push("");
    // What went wrong
    lines.push(c((s) => chalk.bold(s), "What went wrong"));
    lines.push(indent(e.what, 2));
    lines.push("");
    // Affected fields
    if (e.fields.length > 0) {
        lines.push(c((s) => chalk.bold(s), "Affected field(s)"));
        for (const field of e.fields) {
            lines.push(`  ${c((s) => chalk.cyan(s), "◆")} ${c((s) => chalk.cyan(s), field)}`);
        }
        lines.push("");
    }
    // Suggested fix
    lines.push(c((s) => chalk.bold(s), "Suggested fix"));
    const fixLines = e.fix.split("\n");
    for (const line of fixLines) {
        const isCode = line.startsWith(" ") || line.startsWith("//") || line.match(/^(const|let|var|await|if|throw|return)/);
        if (isCode) {
            lines.push(`  ${c((s) => chalk.green(s), line)}`);
        }
        else {
            lines.push(`  ${line}`);
        }
    }
    lines.push("");
    // Docs link
    lines.push(`${c((s) => chalk.dim(s), "docs →")} ${c((s) => chalk.dim.underline(s), e.docs)}`);
    lines.push("");
    return lines.join("\n");
}
export function formatRawError(err) {
    const e = err;
    const msg = e?.stack ?? e?.message ?? String(err);
    return c((s) => chalk.dim(s), msg);
}
function indent(text, spaces) {
    const pad = " ".repeat(spaces);
    return text
        .split("\n")
        .map((l) => pad + l)
        .join("\n");
}
