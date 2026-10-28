import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_EXTENSIONS, loadConfig, resolveExtensions } from '../../src/config.js';

let tmpDir: string;

beforeEach(() => {
    tmpDir = join((tmpDir = tmpdir()), `check-line-limits-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
    it('returns defaults when config file is missing', () => {
        const config = loadConfig(join(tmpDir, 'nonexistent.json'));
        expect(config.warn).toBe(500);
        expect(config.error).toBe(1000);
        expect(config.scanDirs).toEqual(['src', 'tests']);
        expect(config.exclude).toEqual(['**/*.d.ts', '**/*.generated.*']);
        expect(config.skipDirs).toEqual(['node_modules', '.git', 'dist', 'coverage']);
        expect(config.extensions).toEqual({});
    });

    it('loads full config from file', () => {
        const configPath = join(tmpDir, 'line-limits.json');
        writeFileSync(
            configPath,
            JSON.stringify({
                warn: 100,
                error: 200,
                scanDirs: ['lib'],
                skipDirs: ['vendor'],
                exclude: ['build/**'],
                extensions: { '.py': 'py' }
            })
        );
        const config = loadConfig(configPath);
        expect(config.warn).toBe(100);
        expect(config.error).toBe(200);
        expect(config.scanDirs).toEqual(['lib']);
        expect(config.exclude).toEqual(['build/**']);
        expect(config.skipDirs).toEqual(['vendor']);
        expect(config.extensions).toEqual({ '.py': 'py' });
    });

    it('merges partial config with defaults', () => {
        const configPath = join(tmpDir, 'line-limits.json');
        writeFileSync(configPath, JSON.stringify({ warn: 50 }));
        const config = loadConfig(configPath);
        expect(config.warn).toBe(50);
        expect(config.error).toBe(1000);
        expect(config.scanDirs).toEqual(['src', 'tests']);
        expect(config.skipDirs).toEqual(['node_modules', '.git', 'dist', 'coverage']);
        expect(config.extensions).toEqual({});
    });

    it('handles malformed JSON gracefully', () => {
        const configPath = join(tmpDir, 'bad.json');
        writeFileSync(configPath, 'not json{{{');
        const config = loadConfig(configPath);
        expect(config.warn).toBe(500);
        expect(config.error).toBe(1000);
    });
});

describe('resolveExtensions', () => {
    it('returns the default mappings when none are configured', () => {
        expect(resolveExtensions({})).toEqual(DEFAULT_EXTENSIONS);
    });

    it('merges configured mappings over the defaults', () => {
        const resolved = resolveExtensions({ extensions: { '.py': 'py', '.ts': 'tsx' } });
        expect(resolved['.py']).toBe('py');
        expect(resolved['.ts']).toBe('tsx');
        expect(resolved['.js']).toBe('js');
    });
});
