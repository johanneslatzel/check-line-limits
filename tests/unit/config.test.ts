import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../../src/config.js';

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
        expect(config.limit).toBe(1000);
        expect(config.scanDirs).toEqual(['src', 'tests']);
        expect(config.exclude).toContain('dist/**');
        expect(config.skipDirs).toEqual(['node_modules', '.git', 'dist', 'coverage']);
    });

    it('loads full config from file', () => {
        const configPath = join(tmpDir, 'line-limits.json');
        writeFileSync(
            configPath,
            JSON.stringify({
                warn: 100,
                limit: 200,
                scanDirs: ['lib'],
                skipDirs: ['vendor'],
                exclude: ['build/**']
            })
        );
        const config = loadConfig(configPath);
        expect(config.warn).toBe(100);
        expect(config.limit).toBe(200);
        expect(config.scanDirs).toEqual(['lib']);
        expect(config.exclude).toEqual(['build/**']);
        expect(config.skipDirs).toEqual(['vendor']);
    });

    it('merges partial config with defaults', () => {
        const configPath = join(tmpDir, 'line-limits.json');
        writeFileSync(configPath, JSON.stringify({ warn: 50 }));
        const config = loadConfig(configPath);
        expect(config.warn).toBe(50);
        expect(config.limit).toBe(1000);
        expect(config.scanDirs).toEqual(['src', 'tests']);
        expect(config.skipDirs).toEqual(['node_modules', '.git', 'dist', 'coverage']);
    });

    it('handles malformed JSON gracefully', () => {
        const configPath = join(tmpDir, 'bad.json');
        writeFileSync(configPath, 'not json{{{');
        const config = loadConfig(configPath);
        expect(config.warn).toBe(500);
        expect(config.limit).toBe(1000);
    });
});
