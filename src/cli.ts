#!/usr/bin/env node

/**
 * CLI entry point for check-line-limits.
 *
 * Usage:
 *   check-line-limits [options]
 *
 * Options:
 *   --config <path>  Path to line-limits.json (default: line-limits.json)
 *   --warn <n>       Override warn threshold
 *   --limit <n>      Override limit threshold
 *   --json           Output machine-readable JSON
 */

import { loadConfig } from './config.js';
import { checkLineLimits } from './check-line-limits.js';

const args = process.argv.slice(2);

function flag(name: string): boolean {
    return args.includes(`--${name}`);
}

function option(name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const JSON_OUTPUT = flag('json');
const configPath = option('config') ?? 'line-limits.json';
const overrideWarn = option('warn');
const overrideLimit = option('limit');

const config = loadConfig(configPath);
if (overrideWarn !== undefined) {
    config.warn = Number(overrideWarn);
}
if (overrideLimit !== undefined) {
    config.limit = Number(overrideLimit);
}

const { files, hasOverLimit } = checkLineLimits(process.cwd(), config);

if (JSON_OUTPUT) {
    const output = { warn: config.warn, limit: config.limit, hasOverLimit, files };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
} else {
    for (const r of files) {
        if (r.level === 'error') {
            console.error(`✗  ${r.path}: ${r.sloc} SLOC (limit ${config.limit})`);
        } else if (r.level === 'warn') {
            console.warn(`⚠  ${r.path}: ${r.sloc} SLOC (warn ${config.warn})`);
        }
    }
    const errorCount = files.filter((r) => r.level === 'error').length;
    const warnCount = files.filter((r) => r.level === 'warn').length;
    if (errorCount > 0) {
        console.error(`\n${errorCount} file(s) exceed the ${config.limit}-SLOC limit.`);
    }
    if (warnCount > 0) {
        console.warn(`${warnCount} file(s) exceed the ${config.warn}-SLOC warning threshold.`);
    }
    if (errorCount === 0 && warnCount === 0) {
        console.log(
            `✓  All ${files.length} file(s) within limits (warn ${config.warn}, limit ${config.limit}).`
        );
    }
}

process.exit(hasOverLimit ? 1 : 0);
