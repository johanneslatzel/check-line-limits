import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let tmpDir: string;
let cliPath: string;

beforeAll(() => {
    const build = spawnSync('npm', ['run', 'build'], {
        cwd: join(import.meta.dirname, '../..'),
        encoding: 'utf8'
    });
    if (build.status !== 0) {
        throw new Error(`Build failed: ${build.stderr}`);
    }
});

beforeEach(() => {
    tmpDir = join(tmpdir(), `check-line-limits-integration-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cliPath = join(process.cwd(), 'dist', 'cli.js');
});

afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
});

describe('CLI integration', () => {
    it('exits 0 when all files are within limits', () => {
        // Create a small file
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        writeFileSync(
            join(tmpDir, 'src', 'small.ts'),
            'export const x = 1;\nexport const y = 2;\n'
        );

        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('✓');
        expect(result.stdout).toContain('within thresholds');
    });

    it('exits 1 when a file exceeds the error threshold', () => {
        // Create a large file
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        const lines = Array.from({ length: 1100 }, (_, i) => `const line${i} = ${i};`);
        writeFileSync(join(tmpDir, 'src', 'large.ts'), lines.join('\n'));

        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('✗');
        expect(result.stderr).toContain('large.ts');
        expect(result.stderr).toContain('exceed');
    });

    it('outputs JSON when --json flag is used', () => {
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        writeFileSync(join(tmpDir, 'src', 'small.ts'), 'export const x = 1;\n');

        const result = spawnSync('node', [cliPath, '--json'], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(0);
        const output = JSON.parse(result.stdout);
        expect(output).toHaveProperty('warn');
        expect(output).toHaveProperty('error');
        expect(output).toHaveProperty('hasErrors');
        expect(output).toHaveProperty('files');
        expect(Array.isArray(output.files)).toBe(true);
    });

    it('respects custom config file', () => {
        // Create a custom config
        writeFileSync(join(tmpDir, 'custom.json'), JSON.stringify({ warn: 10, error: 20 }));

        // Create a file that exceeds the custom error threshold
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        const lines = Array.from({ length: 25 }, (_, i) => `const line${i} = ${i};`);
        writeFileSync(join(tmpDir, 'src', 'medium.ts'), lines.join('\n'));

        const result = spawnSync('node', [cliPath, '--config', 'custom.json'], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('medium.ts');
    });

    it('respects --warn and --error overrides', () => {
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        const lines = Array.from({ length: 15 }, (_, i) => `const line${i} = ${i};`);
        writeFileSync(join(tmpDir, 'src', 'small.ts'), lines.join('\n'));

        // With default limits, this should pass
        const result1 = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });
        expect(result1.status).toBe(0);

        // With custom limits, this should fail
        const result2 = spawnSync('node', [cliPath, '--error', '10'], {
            cwd: tmpDir,
            encoding: 'utf8'
        });
        expect(result2.status).toBe(1);
    });

    it('skips unsupported file types', () => {
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        writeFileSync(join(tmpDir, 'src', 'data.json'), '{"key": "value"}');
        writeFileSync(join(tmpDir, 'src', 'readme.md'), '# Title');

        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('0 file(s)');
    });

    it('excludes files matching patterns', () => {
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        writeFileSync(join(tmpDir, 'src', 'index.d.ts'), 'export declare const x: number;\n');

        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(0);
        // Should not include .d.ts files
        expect(result.stdout).toContain('0 file(s)');
    });

    it('handles missing scan directories gracefully', () => {
        // No src or tests directory
        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('0 file(s)');
    });

    it('warns files between warn and error thresholds', () => {
        mkdirSync(join(tmpDir, 'src'), { recursive: true });
        const lines = Array.from({ length: 600 }, (_, i) => `const line${i} = ${i};`);
        writeFileSync(join(tmpDir, 'src', 'warn.ts'), lines.join('\n'));

        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(0);
        expect(result.stderr).toContain('⚠');
        expect(result.stderr).toContain('warn.ts');
    });

    it('shows summary counts for warnings and errors', () => {
        mkdirSync(join(tmpDir, 'src'), { recursive: true });

        // Create a warning file (500-999 SLOC)
        const warnLines = Array.from({ length: 600 }, (_, i) => `const w${i} = ${i};`);
        writeFileSync(join(tmpDir, 'src', 'warn.ts'), warnLines.join('\n'));

        // Create an error file (1000+ SLOC)
        const errorLines = Array.from({ length: 1100 }, (_, i) => `const e${i} = ${i};`);
        writeFileSync(join(tmpDir, 'src', 'error.ts'), errorLines.join('\n'));

        const result = spawnSync('node', [cliPath], {
            cwd: tmpDir,
            encoding: 'utf8'
        });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('1 file(s) exceed');
        expect(result.stderr).toContain('1 file(s) exceed');
    });
});
