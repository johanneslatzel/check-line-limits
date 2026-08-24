import { readFileSync } from 'node:fs';

/** Configuration for line-limits checking. */
export interface LineLimitsConfig {
    /** SLOC count that triggers a warning. @default 500 */
    warn: number;
    /** SLOC count that triggers a hard failure. @default 1000 */
    limit: number;
    /** Directories to scan relative to the project root. @default ["src", "tests"] */
    scanDirs: string[];
    /** Glob-like patterns to exclude from scanning. */
    exclude: string[];
}

const DEFAULTS: LineLimitsConfig = {
    warn: 500,
    limit: 1000,
    scanDirs: ['src', 'tests'],
    exclude: ['dist/**', 'coverage/**', '**/*.d.ts', '**/*.generated.*', 'swagger/**']
};

/**
 * Load line-limits configuration from a JSON file, merged with defaults.
 *
 * @param configPath - Path to the config file (default: `"line-limits.json"`).
 * @returns The merged configuration.
 */
export function loadConfig(configPath = 'line-limits.json'): LineLimitsConfig {
    try {
        const raw = readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<LineLimitsConfig>;
        return {
            ...DEFAULTS,
            ...parsed
        };
    } catch {
        return { ...DEFAULTS };
    }
}
