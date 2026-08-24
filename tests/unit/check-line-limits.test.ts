import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkLineLimits } from '../../src/check-line-limits.js';
import type { LineLimitsConfig } from '../../src/config.js';

let tmpDir: string;

beforeEach(() => {
    tmpDir = join(tmpdir(), `check-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
});

function makeConfig(overrides: Partial<LineLimitsConfig> = {}): LineLimitsConfig {
    return {
        warn: 5,
        error: 10,
        scanDirs: ['src'],
        skipDirs: ['node_modules', '.git', 'dist', 'coverage'],
        exclude: [],
        ...overrides
    };
}

function generateCode(n: number): string {
    return Array.from({ length: n }, (_, i) => `export const v${i} = ${i};`).join('\n');
}

describe('checkLineLimits', () => {
    it('returns empty results for nonexistent scanDirs', () => {
        const config = makeConfig({ scanDirs: ['nonexistent'] });
        const result = checkLineLimits(tmpDir, config);
        expect(result.files).toEqual([]);
        expect(result.hasErrors).toBe(false);
    });

    it('marks files under the error threshold as ok', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/small.ts'), generateCode(3));
        const result = checkLineLimits(tmpDir, makeConfig());
        expect(result.files).toHaveLength(1);
        expect(result.files[0]?.level).toBe('ok');
        expect(result.files[0]?.sloc).toBe(3);
        expect(result.hasErrors).toBe(false);
    });

    it('marks files at warn threshold as warn', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/medium.ts'), generateCode(5));
        const result = checkLineLimits(tmpDir, makeConfig());
        expect(result.files[0]?.level).toBe('warn');
        expect(result.hasErrors).toBe(false);
    });

    it('marks files at the error threshold as error', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/large.ts'), generateCode(10));
        const result = checkLineLimits(tmpDir, makeConfig());
        expect(result.files[0]?.level).toBe('error');
        expect(result.hasErrors).toBe(true);
    });

    it('marks files over the error threshold as error', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/huge.ts'), generateCode(20));
        const result = checkLineLimits(tmpDir, makeConfig());
        expect(result.files[0]?.level).toBe('error');
        expect(result.hasErrors).toBe(true);
    });

    it('skips unsupported file extensions', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/data.json'), '{"key": "value"}');
        writeFileSync(join(tmpDir, 'src/readme.md'), '# Hello');
        const result = checkLineLimits(tmpDir, makeConfig());
        expect(result.files).toHaveLength(0);
    });

    it('respects exclude patterns', () => {
        const config = makeConfig({ exclude: ['**/*.d.ts'] });
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/app.ts'), generateCode(3));
        writeFileSync(join(tmpDir, 'src/types.d.ts'), generateCode(20));
        const result = checkLineLimits(tmpDir, config);
        expect(result.files).toHaveLength(1);
        expect(result.files[0]?.path).toBe('src/app.ts');
    });

    it('scans multiple scanDirs', () => {
        mkdirSync(join(tmpDir, 'src'));
        mkdirSync(join(tmpDir, 'tests'));
        writeFileSync(join(tmpDir, 'src/app.ts'), generateCode(3));
        writeFileSync(join(tmpDir, 'tests/app.test.ts'), generateCode(2));
        const config = makeConfig({ scanDirs: ['src', 'tests'] });
        const result = checkLineLimits(tmpDir, config);
        expect(result.files).toHaveLength(2);
    });

    it('does not scan scripts/ directory by default', () => {
        mkdirSync(join(tmpDir, 'scripts'));
        writeFileSync(join(tmpDir, 'scripts/tool.mjs'), generateCode(20));
        const result = checkLineLimits(tmpDir, makeConfig());
        expect(result.files).toHaveLength(0);
    });

    it('skips files that cannot be read', () => {
        mkdirSync(join(tmpDir, 'src'));
        const filePath = join(tmpDir, 'src/locked.ts');
        writeFileSync(filePath, generateCode(3));
        chmodSync(filePath, 0o000);
        try {
            const result = checkLineLimits(tmpDir, makeConfig());
            expect(result.files).toHaveLength(0);
        } finally {
            chmodSync(filePath, 0o644);
        }
    });
});
