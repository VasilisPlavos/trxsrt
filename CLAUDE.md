# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**trxsrt** is a CLI tool for translating SRT subtitle files using Google Translate and DeepLX (no API key required). Published as the `trxsrt` npm package. Requires Node.js >= 20.9.0.

## Commands

- **Build:** `npm run build` (runs `tsc`, outputs to `dist/`)
- **Run in dev:** `npm run translate -- <file.srt> --from <lang> --to <lang>`
- **Test:** `npm test` (translates `test.srt` from Greek to English with concurrency 1)
- **Publish:** `npm version patch && npm publish` (auto-builds via `prepublishOnly`)

No linter or test framework is configured. The "test" script is a manual smoke test that exercises the full translation pipeline.

## Architecture

Four source files in `src/`, compiled to `dist/`:

- **`src/translate.ts`** — Main entry point. Contains CLI setup (Commander.js), SRT parsing/rebuilding, retry logic with exponential backoff, cookie management for CAPTCHA handling, and the translation orchestration loop using `p-limit` for concurrency. Alternates between GTX and DeepLX in round-robin (even lines → GTX, odd lines → DeepLX).
- **`src/services/gtxServices.ts`** — Google Translate GTX API client. Makes HTTP requests to `translate.googleapis.com`, parses responses, detects CAPTCHA blocks, and handles interactive cookie prompting.
- **`src/services/deepLxServices.ts`** — DeepLX translation client. Uses the `deeplx` npm package to translate via the unofficial DeepL API (no API key required).
- **`src/errors/CaptchaError.ts`** — Custom error class thrown when Google returns a CAPTCHA challenge instead of a translation.

**Data flow:** CLI args → validate language/file → parse SRT → preflight API test (GTX) → parallel translate lines in round-robin across GTX and DeepLX (with retry) → rebuild SRT → write output files.

## Key Design Details

- Two translation backends are used in round-robin (even-indexed lines → GTX, odd-indexed lines → DeepLX) to distribute load and reduce rate-limit errors.
- Neither API requires authentication. Rate limiting is handled via configurable concurrency (`--concurrency`, default 10) and automatic retry with jitter.
- CAPTCHA recovery is interactive (GTX only): the tool detects CAPTCHA responses, prompts the user to solve it in a browser, and persists the `GOOGLE_ABUSE_EXEMPTION` cookie via the `conf` package.
- `CaptchaError` is explicitly non-retryable; network errors, 5xx, and 429 are retryable.
- TypeScript strict mode is enabled. Module system is Node16/CommonJS.
- CI runs on GitHub Actions: install → build → verify `--help` → auto-publish on main push.
