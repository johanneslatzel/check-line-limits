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
    "error": 1000
}
```

All keys are optional. The sample sets the two thresholds; the full set and defaults are in the [`LineLimitsConfig` table](api-reference.md#linelimitsconfig).

To check another language, map its extension to a `sloc` language identifier. A Python project:

```json
{
    "extensions": {
        ".py": "py"
    }
}
```

See [`extensions`](api-reference.md#linelimitsconfig) for the mapping format and examples.

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

```text
✓  All 15 file(s) within thresholds (warn 500, error 1000).
```

Output when files exceed thresholds:

```text
⚠  src/utils.ts: 520 SLOC (warn 500)
✗  src/big-file.ts: 1200 SLOC (error 1000)
```

Warnings do not affect the exit code. Any file at or above `error` exits `1`.

See also: [API Reference](api-reference.md) for CLI flags and JSON output.
