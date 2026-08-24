# Quickstart

## Install

Requires Node.js >= 20.9.

```bash
npm install --save-dev @johannes.latzel/check-line-limits
```

## Configure

Optionally create `line-limits.json` in the project root:

```json
{
    "warn": 500,
    "error": 1000,
    "scanDirs": ["src", "tests"],
    "skipDirs": ["node_modules", ".git", "dist", "coverage"],
    "exclude": ["**/*.d.ts", "**/*.generated.*"]
}
```

All keys are optional; the sample above matches the built-in defaults. See the [`LineLimitsConfig` table](api-reference.md#linelimitsconfig) for all options.

## Run

```bash
npx check-line-limits
```

Or add a script to `package.json`:

```json
{
    "scripts": {
        "check:lines": "check-line-limits"
    }
}
```

Output when all files pass:

```
✓  All 15 file(s) within thresholds (warn 500, error 1000).
```

Output when files exceed thresholds:

```
⚠  src/utils.ts: 520 SLOC (warn 500)
✗  src/big-file.ts: 1200 SLOC (error 1000)
```

Warnings do not affect the exit code. Any file at or above `error` exits `1`.

See also: [API Reference](api-reference.md) for CLI flags and JSON output.
