import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const CLI_PATH = join(import.meta.dirname, '../../dist/cli.js');

let tmpDir: string;

function generateCode(n: number): string {
    return Array.from({ length: n }, (_, i) => `export const v${i} = ${i};`).join('\n');
}

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
    tmpDir = join(tmpdir(), `cli-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
});

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
    const result = spawnSync('node', [CLI_PATH, ...args], {
        cwd: tmpDir,
        encoding: 'utf8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1
    };
}

describe('CLI', () => {
    it('exits 0 when all files are within limits', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/small.ts'), generateCode(3));
        writeFileSync(
            join(tmpDir, 'line-limits.json'),
            JSON.stringify({ warn: 500, error: 1000, scanDirs: ['src'], exclude: [] })
        );
        const { exitCode, stdout } = runCli([]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('within thresholds');
    });

    it('exits 1 when a file exceeds the error threshold', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/big.ts'), generateCode(20));
        writeFileSync(
            join(tmpDir, 'line-limits.json'),
            JSON.stringify({ warn: 5, error: 10, scanDirs: ['src'], exclude: [] })
        );
        const { exitCode, stderr } = runCli([]);
        expect(exitCode).toBe(1);
        expect(stderr).toContain('SLOC (error 10)');
    });

    it('outputs JSON with --json flag', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/small.ts'), generateCode(3));
        writeFileSync(
            join(tmpDir, 'line-limits.json'),
            JSON.stringify({ warn: 500, error: 1000, scanDirs: ['src'], exclude: [] })
        );
        const { exitCode, stdout } = runCli(['--json']);
        expect(exitCode).toBe(0);
        const parsed = JSON.parse(stdout);
        expect(parsed).toHaveProperty('files');
        expect(parsed).toHaveProperty('hasErrors', false);
        expect(parsed).toHaveProperty('warn', 500);
        expect(parsed).toHaveProperty('error', 1000);
    });

    it('respects --error override', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/file.ts'), generateCode(8));
        writeFileSync(
            join(tmpDir, 'line-limits.json'),
            JSON.stringify({ warn: 500, error: 1000, scanDirs: ['src'], exclude: [] })
        );
        const { exitCode } = runCli(['--error', '5']);
        expect(exitCode).toBe(1);
    });

    it('respects --warn override', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/file.ts'), generateCode(3));
        writeFileSync(
            join(tmpDir, 'line-limits.json'),
            JSON.stringify({ warn: 500, error: 1000, scanDirs: ['src'], exclude: [] })
        );
        const { exitCode, stderr } = runCli(['--warn', '2']);
        expect(exitCode).toBe(0);
        expect(stderr).toContain('SLOC (warn 2)');
    });

    it('uses defaults when no config file exists', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/small.ts'), generateCode(3));
        const { exitCode, stdout } = runCli([]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain('within thresholds');
    });
});
