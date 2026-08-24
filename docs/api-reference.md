# API Reference

```ts
import { checkLineLimits, loadConfig } from '@johannes.latzel/check-line-limits';
import type { LineLimitsConfig, FileResult, CheckResult } from '@johannes.latzel/check-line-limits';
```

## `loadConfig(configPath?)`

Load configuration from a JSON file, merged with defaults. A missing or malformed file returns the defaults. Returns `LineLimitsConfig`.

| Param        | Type     | Default              | Description             |
| ------------ | -------- | -------------------- | ----------------------- |
| `configPath` | `string` | `"line-limits.json"` | Path to the config file |

## `checkLineLimits(root, config)`

Scan the configured directories, count SLOC per file, and classify each file against the thresholds. Returns `CheckResult`.

| Param    | Type               | Description                       |
| -------- | ------------------ | --------------------------------- |
| `root`   | `string`           | Absolute path to the project root |
| `config` | `LineLimitsConfig` | Configuration                     |

```ts
const result = checkLineLimits(process.cwd(), loadConfig());
if (result.hasOverLimit) {
    process.exit(1);
}
```

## Types

### `LineLimitsConfig`

| Option     | Type       | Default            | Description                                       |
| ---------- | ---------- | ------------------ | ------------------------------------------------- |
| `warn`     | `number`   | `500`              | SLOC count that triggers a warning                |
| `limit`    | `number`   | `1000`             | SLOC count that fails the check                   |
| `scanDirs` | `string[]` | `["src", "tests"]` | Directories to scan, relative to the project root |
| `exclude`  | `string[]` | see below          | Glob-like patterns to exclude from scanning       |

Default `exclude`: `["dist/**", "coverage/**", "**/*.d.ts", "**/*.generated.*", "swagger/**"]`

### `FileResult`

| Field   | Type                        | Description                                                                  |
| ------- | --------------------------- | ---------------------------------------------------------------------------- |
| `path`  | `string`                    | Path relative to the project root                                            |
| `sloc`  | `number`                    | Source lines of code                                                         |
| `level` | `"ok" \| "warn" \| "error"` | `ok`: below `warn`; `warn`: at or above `warn`; `error`: at or above `limit` |

### `CheckResult`

| Field          | Type           | Description                             |
| -------------- | -------------- | --------------------------------------- |
| `files`        | `FileResult[]` | One entry per scanned file              |
| `hasOverLimit` | `boolean`      | Whether any file is at or above `limit` |

## CLI

Binary name: `check-line-limits`.

| Option            | Description                    | Default            |
| ----------------- | ------------------------------ | ------------------ |
| `--config <path>` | Path to the config file        | `line-limits.json` |
| `--warn <n>`      | Override the `warn` threshold  | config value       |
| `--limit <n>`     | Override the `limit` threshold | config value       |
| `--json`          | Print JSON instead of text     | off                |

Exit codes: `0` when all files are within limits, `1` when at least one file is at or above `limit`.

JSON output:

```json
{
    "warn": 500,
    "limit": 1000,
    "hasOverLimit": false,
    "files": [{ "path": "src/index.ts", "sloc": 50, "level": "ok" }]
}
```
