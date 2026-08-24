import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { walkDir, isExcluded } from '../../src/walker.js';
import type { LineLimitsConfig } from '../../src/config.js';

let tmpDir: string;

beforeEach(() => {
    tmpDir = join(tmpdir(), `walker-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
});

const baseConfig: LineLimitsConfig = {
    warn: 500,
    limit: 1000,
    scanDirs: ['src', 'tests'],
    skipDirs: ['node_modules', '.git', 'dist', 'coverage'],
    exclude: []
};

describe('isExcluded', () => {
    it('matches dist/** pattern', () => {
        expect(isExcluded('dist/index.js', ['dist/**'])).toBe(true);
    });

    it('matches **/*.d.ts pattern', () => {
        expect(isExcluded('src/foo.d.ts', ['**/*.d.ts'])).toBe(true);
    });

    it('matches **/*.generated.* pattern', () => {
        expect(isExcluded('src/foo.generated.ts', ['**/*.generated.*'])).toBe(true);
    });

    it('does not match unrelated files', () => {
        expect(isExcluded('src/foo.ts', ['dist/**'])).toBe(false);
    });

    it('handles exact directory match', () => {
        expect(isExcluded('dist', ['dist/**'])).toBe(true);
    });

    it('handles swagger/** pattern', () => {
        expect(isExcluded('swagger/api.ts', ['swagger/**'])).toBe(true);
    });

    it('handles exact file match', () => {
        expect(isExcluded('foo.ts', ['foo.ts'])).toBe(true);
    });
});

describe('walkDir', () => {
    it('finds TypeScript files', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/app.ts'), 'const x = 1;');
        const result = walkDir(join(tmpDir, 'src'), tmpDir, baseConfig);
        expect(result).toHaveLength(1);
        expect(result[0]?.relPath).toBe('src/app.ts');
        expect(result[0]?.ext).toBe('.ts');
    });

    it('finds .tsx, .js, .jsx, .mjs files', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/a.tsx'), '');
        writeFileSync(join(tmpDir, 'src/b.js'), '');
        writeFileSync(join(tmpDir, 'src/c.jsx'), '');
        writeFileSync(join(tmpDir, 'src/d.mjs'), '');
        const result = walkDir(join(tmpDir, 'src'), tmpDir, baseConfig);
        expect(result).toHaveLength(4);
    });

    it('skips unsupported extensions', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/readme.md'), '');
        writeFileSync(join(tmpDir, 'src/data.json'), '');
        writeFileSync(join(tmpDir, 'src/image.png'), '');
        const result = walkDir(join(tmpDir, 'src'), tmpDir, baseConfig);
        expect(result).toHaveLength(0);
    });

    it('skips node_modules', () => {
        mkdirSync(join(tmpDir, 'node_modules/pkg'), { recursive: true });
        writeFileSync(join(tmpDir, 'node_modules/pkg/index.ts'), '');
        const result = walkDir(tmpDir, tmpDir, baseConfig);
        expect(result).toHaveLength(0);
    });

    it('skips .git directory', () => {
        mkdirSync(join(tmpDir, '.git/objects'), { recursive: true });
        writeFileSync(join(tmpDir, '.git/config.ts'), '');
        const result = walkDir(tmpDir, tmpDir, baseConfig);
        expect(result).toHaveLength(0);
    });

    it('skips dist directory', () => {
        mkdirSync(join(tmpDir, 'dist'));
        writeFileSync(join(tmpDir, 'dist/bundle.js'), '');
        const result = walkDir(tmpDir, tmpDir, baseConfig);
        expect(result).toHaveLength(0);
    });

    it('skips coverage directory', () => {
        mkdirSync(join(tmpDir, 'coverage'));
        writeFileSync(join(tmpDir, 'coverage/lcov.js'), '');
        const result = walkDir(tmpDir, tmpDir, baseConfig);
        expect(result).toHaveLength(0);
    });

    it('prunes directories listed in skipDirs', () => {
        const config = { ...baseConfig, skipDirs: ['vendor'] };
        mkdirSync(join(tmpDir, 'src/vendor'), { recursive: true });
        mkdirSync(join(tmpDir, 'src/lib'), { recursive: true });
        writeFileSync(join(tmpDir, 'src/vendor/third-party.ts'), '');
        writeFileSync(join(tmpDir, 'src/lib/app.ts'), '');
        const result = walkDir(join(tmpDir, 'src'), tmpDir, config);
        expect(result).toHaveLength(1);
        expect(result[0]?.relPath).toBe('src/lib/app.ts');
    });

    it('replaces default skipDirs when provided', () => {
        const config = { ...baseConfig, skipDirs: ['node_modules'] };
        mkdirSync(join(tmpDir, 'dist'));
        writeFileSync(join(tmpDir, 'dist/bundle.js'), '');
        const result = walkDir(tmpDir, tmpDir, config);
        expect(result).toHaveLength(1);
        expect(result[0]?.relPath).toBe('dist/bundle.js');
    });

    it('applies exclude patterns', () => {
        const config = { ...baseConfig, exclude: ['**/*.d.ts'] };
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/app.ts'), '');
        writeFileSync(join(tmpDir, 'src/types.d.ts'), '');
        const result = walkDir(join(tmpDir, 'src'), tmpDir, config);
        expect(result).toHaveLength(1);
        expect(result[0]?.relPath).toBe('src/app.ts');
    });

    it('returns empty for nonexistent directory', () => {
        const result = walkDir(join(tmpDir, 'nonexistent'), tmpDir, baseConfig);
        expect(result).toHaveLength(0);
    });

    it('handles nested directories', () => {
        mkdirSync(join(tmpDir, 'src/lib/utils'), { recursive: true });
        writeFileSync(join(tmpDir, 'src/app.ts'), '');
        writeFileSync(join(tmpDir, 'src/lib/helper.ts'), '');
        writeFileSync(join(tmpDir, 'src/lib/utils/deep.ts'), '');
        const result = walkDir(join(tmpDir, 'src'), tmpDir, baseConfig);
        expect(result).toHaveLength(3);
    });

    it('skips symlinks', () => {
        mkdirSync(join(tmpDir, 'src'));
        writeFileSync(join(tmpDir, 'src/real.ts'), '');
        writeFileSync(join(tmpDir, 'target.txt'), 'x');
        symlinkSync(join(tmpDir, 'target.txt'), join(tmpDir, 'src/link.ts'));
        const result = walkDir(join(tmpDir, 'src'), tmpDir, baseConfig);
        expect(result).toHaveLength(1);
        expect(result[0]?.relPath).toBe('src/real.ts');
    });
});
