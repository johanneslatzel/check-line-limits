# Architecture

Four modules around the `sloc` line counter.

## Modules

- [`config.ts`](https://github.com/johanneslatzel/check-line-limits/blob/main/src/config.ts): defines `LineLimitsConfig` and `DEFAULTS`; loads the JSON config with `readFileSync` and merges partial configs over the defaults; missing or malformed files yield the defaults.
- [`walker.ts`](https://github.com/johanneslatzel/check-line-limits/blob/main/src/walker.ts): walks each scan directory recursively with `readdirSync`; skips `node_modules`, `.git`, `dist`, and `coverage`; keeps only `.ts`, `.tsx`, `.js`, `.jsx`, and `.mjs` files not matched by an exclude pattern.
- [`check-line-limits.ts`](https://github.com/johanneslatzel/check-line-limits/blob/main/src/check-line-limits.ts): reads each walked file and counts SLOC through the CJS `sloc` package (default import, typed by `@types/sloc`); classifies each file as `ok`, `warn`, or `error`.
- [`cli.ts`](https://github.com/johanneslatzel/check-line-limits/blob/main/src/cli.ts): parses `--config`, `--warn`, `--limit`, and `--json`; writes warnings and errors to stderr, success messages to stdout; exits `1` when any file reaches the limit.

[`index.ts`](https://github.com/johanneslatzel/check-line-limits/blob/main/src/index.ts) re-exports the public API: `checkLineLimits`, `loadConfig`, and the three result and config types. The CLI is a separate entry point.

## Data Flow

```
CLI args -> loadConfig -> walkDir (per scanDir) -> readFileSync -> sloc -> classify -> output -> exit code
```

## Design Decisions

- One runtime dependency (`sloc`); walking, exclusion matching, and IO use `node:fs` and `node:path` only.
- Filesystem operations are synchronous.
- Unreadable files and nonexistent scan directories are skipped silently.
- Exclusion patterns match suffixes (`**/*.d.ts`), directory prefixes (`dist/**`), and infixes (`**/*.generated.*`); see [`isExcluded`](https://github.com/johanneslatzel/check-line-limits/blob/main/src/walker.ts).
