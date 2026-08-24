import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sloc from 'sloc';
import type { LineLimitsConfig } from './config.js';
import { walkDir } from './walker.js';

/**
 * Map of file extensions to the language identifier expected by the `sloc` package.
 * The `sloc` package uses bare identifiers (e.g. "ts") rather than file extensions.
 */
const EXT_MAP: Record<string, string> = {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'js',
    '.jsx': 'jsx',
    '.mjs': 'mjs'
};

/** Result for a single scanned file. */
export interface FileResult {
    /** Path relative to the project root. */
    path: string;
    /** Source lines of code. */
    sloc: number;
    /** Severity level. */
    level: 'ok' | 'warn' | 'error';
}

/** Outcome of a line-limits check. */
export interface CheckResult {
    /** Per-file results. */
    files: FileResult[];
    /** Whether any file is at or above the error threshold. */
    hasErrors: boolean;
}

/**
 * Check all source files in a project against the configured SLOC limits.
 *
 * @param root   - Absolute path to the project root.
 * @param config - Line-limits configuration.
 * @returns Per-file results and a summary flag.
 */
export function checkLineLimits(root: string, config: LineLimitsConfig): CheckResult {
    const files: FileResult[] = [];
    let hasErrors = false;

    for (const dir of config.scanDirs) {
        const dirPath = join(root, dir);
        try {
            if (statSync(dirPath).isDirectory()) {
                const walked = walkDir(dirPath, root, config);
                for (const { fullPath, relPath, ext } of walked) {
                    let code: string;
                    try {
                        code = readFileSync(fullPath, 'utf8');
                    } catch {
                        continue;
                    }
                    const lang = EXT_MAP[ext]!;
                    try {
                        const stats = sloc(code, lang);
                        const slocCount = stats.source;
                        let level: FileResult['level'] = 'ok';
                        if (slocCount >= config.error) {
                            level = 'error';
                            hasErrors = true;
                        } else if (slocCount >= config.warn) {
                            level = 'warn';
                        }
                        files.push({ path: relPath, sloc: slocCount, level });
                    } catch {
                        // Unsupported extension — skip silently
                    }
                }
            }
        } catch {
            // scanDir doesn't exist — skip silently
        }
    }

    return { files, hasErrors };
}
