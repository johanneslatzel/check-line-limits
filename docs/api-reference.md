# API Reference

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
if (result.hasErrors) {
    process.exit(1);
}
```

## Types

### `LineLimitsConfig`

| Option     | Type       | Default                                        | Description                                                |
| ---------- | ---------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `warn`     | `number`   | `500`                                          | SLOC count that triggers a warning                         |
| `error`    | `number`   | `1000`                                         | SLOC count that triggers a hard failure                    |
| `scanDirs` | `string[]` | `["src", "tests"]`                             | Directories to scan, relative to the project root          |
| `skipDirs` | `string[]` | `["node_modules", ".git", "dist", "coverage"]` | Directory names pruned from scanning, matched at any depth |
| `exclude`  | `string[]` | see below                                      | Glob-like patterns to exclude from scanning                |

Default `exclude`: `["**/*.d.ts", "**/*.generated.*"]`

### `FileResult`

| Field   | Type                        | Description                                                                  |
| ------- | --------------------------- | ---------------------------------------------------------------------------- |
| `path`  | `string`                    | Path relative to the project root                                            |
| `sloc`  | `number`                    | Source lines of code                                                         |
| `level` | `"ok" \| "warn" \| "error"` | `ok`: below `warn`; `warn`: at or above `warn`; `error`: at or above `error` |

### `CheckResult`

| Field       | Type           | Description                             |
| ----------- | -------------- | --------------------------------------- |
| `files`     | `FileResult[]` | One entry per scanned file              |
| `hasErrors` | `boolean`      | Whether any file is at or above `error` |

## CLI

Binary name: `check-line-limits`.

| Option            | Description                    | Default            |
| ----------------- | ------------------------------ | ------------------ |
| `--config <path>` | Path to the config file        | `line-limits.json` |
| `--warn <n>`      | Override the `warn` threshold  | config value       |
| `--error <n>`     | Override the `error` threshold | config value       |
| `--json`          | Print JSON instead of text     | off                |

Exit codes: `0` when all files are within thresholds, `1` when at least one file is at or above `error`.

JSON output:

```json
{
    "warn": 500,
    "error": 1000,
    "hasErrors": false,
    "files": [{ "path": "src/index.ts", "sloc": 50, "level": "ok" }]
}
```
