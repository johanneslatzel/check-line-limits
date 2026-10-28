import { readFileSync } from 'node:fs';

/**
 * Default map of file extensions to the language identifiers expected by the `sloc` package.
 * The `sloc` package uses bare identifiers (e.g. "ts") rather than file extensions.
 */
export const DEFAULT_EXTENSIONS: Record<string, string> = {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.js': 'js',
    '.jsx': 'jsx',
    '.mjs': 'mjs'
};

/** Configuration for line-limits checking. */
export interface LineLimitsConfig {
    /** SLOC count that triggers a warning. @default 500 */
    warn: number;
    /** SLOC count that triggers a hard failure. @default 1000 */
    error: number;
    /** Directories to scan relative to the project root. @default ["src", "tests"] */
    scanDirs: string[];
    /** Directory names pruned from scanning at any depth. @default ["node_modules", ".git", "dist", "coverage"] */
    skipDirs: string[];
    /** Glob-like patterns to exclude from scanning. */
    exclude: string[];
    /**
     * Additional file extension to `sloc` language mappings, merged over
     * {@link DEFAULT_EXTENSIONS}. Keys include the leading dot.
     * @default {}
     */
    extensions?: Record<string, string>;
}

const DEFAULTS: LineLimitsConfig = {
    warn: 500,
    error: 1000,
    scanDirs: ['src', 'tests'],
    skipDirs: ['node_modules', '.git', 'dist', 'coverage'],
    exclude: ['**/*.d.ts', '**/*.generated.*'],
    extensions: {}
};

/**
 * Merge the configured extension mappings over the built-in defaults.
 *
 * @param config - Configuration whose `extensions` are applied on top of the defaults.
 * @returns The effective extension to `sloc` language mapping.
 */
export function resolveExtensions(
    config: Pick<LineLimitsConfig, 'extensions'>
): Record<string, string> {
    return { ...DEFAULT_EXTENSIONS, ...config.extensions };
}

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
