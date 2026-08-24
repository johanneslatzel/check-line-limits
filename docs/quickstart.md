# Quickstart

## Install

Requires Node.js >= 20.9.

```bash
npm install --save-dev @johannes.latzel/check-line-limits
```

## Configure

Create `line-limits.json` in the project root:

```json
{
    "warn": 500,
    "limit": 1000,
    "scanDirs": ["src", "tests"],
    "exclude": ["dist/**", "coverage/**", "**/*.d.ts"]
}
```

All keys are optional. Defaults: see the [`LineLimitsConfig` table](api-reference.md#limelimitsconfig).

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
✓  All 15 file(s) within limits (warn 500, limit 1000).
```

Output when files exceed thresholds:

```
⚠  src/utils.ts: 520 SLOC (warn 500)
✗  src/big-file.ts: 1200 SLOC (limit 1000)
```

Warnings do not affect the exit code. Any file at or above `limit` exits `1`.

## CI

```yaml
- run: npm ci
- run: npm run check:lines
```

See also: [API Reference](api-reference.md) for CLI flags and JSON output.
