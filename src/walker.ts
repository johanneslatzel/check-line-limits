import { readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type { LineLimitsConfig } from './config.js';

/** A file discovered during walking. */
export interface WalkedFile {
    /** Absolute path to the file. */
    fullPath: string;
    /** Path relative to the project root. */
    relPath: string;
    /** File extension (e.g. ".ts"). */
    ext: string;
}

const SUPPORTED_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

/**
 * Check whether a relative path matches any of the exclude patterns.
 */
export function isExcluded(relPath: string, exclude: string[]): boolean {
    return exclude.some((pattern) => {
        const cleaned = pattern.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
        if (cleaned.startsWith('**.') || cleaned.startsWith('*.')) {
            // Extract the part between leading * and trailing * (if any).
            const inner = cleaned.replace(/^\*/, '');
            if (inner.endsWith('*')) {
                // Pattern like *.generated.* → check if the inner part (without *s) is contained.
                const infix = inner.slice(0, -1);
                return relPath.includes(infix);
            }
            // Pattern like *.d.ts → check if the path ends with this suffix.
            return relPath.endsWith(inner);
        }
        return relPath === cleaned || relPath.startsWith(cleaned + '/');
    });
}

/**
 * Walk a directory recursively and return all supported source files.
 */
export function walkDir(dir: string, root: string, config: LineLimitsConfig): WalkedFile[] {
    const results: WalkedFile[] = [];
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (
                entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === 'dist' ||
                entry.name === 'coverage'
            ) {
                continue;
            }
            results.push(...walkDir(fullPath, root, config));
        } else if (entry.isFile()) {
            const ext = extname(entry.name);
            if (!SUPPORTED_EXT.has(ext)) {
                continue;
            }
            const relPath = relative(root, fullPath);
            if (isExcluded(relPath, config.exclude)) {
                continue;
            }
            results.push({ fullPath, relPath, ext });
        }
    }
    return results;
}
