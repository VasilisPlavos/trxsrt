# Changelog

## [Unreleased]

### Added
- DeepLX as a second translation backend alongside Google Translate (GTX).
- Subtitle lines are translated in round-robin: even-indexed lines use GTX, odd-indexed lines use DeepLX. This distributes load across both services and reduces rate-limit errors.
- New service module `src/services/deepLxServices.ts` wrapping the `deeplx` npm package.
- `deeplx` added as a production dependency.

### Changed
- Updated CLI description to reflect dual-backend architecture.
- Updated README.md, skill.md, CLAUDE.md, and package.json description to document the dual-backend round-robin approach.

## [1.0.2] - 2026-02-15

### Fixed
- CAPTCHA detection and interactive recovery flow (#3, #4).
- Moved source files to `src/` directory with proper TypeScript project structure.

### Added
- `src/services/gtxServices.ts` — extracted Google Translate API client into its own service module.
- `src/errors/CaptchaError.ts` — custom error class for CAPTCHA detection.
- Interactive CAPTCHA recovery: prompts user to solve CAPTCHA and paste cookie.
- Cookie persistence via `conf` package for reuse across runs.
- `--cookie` and `--non-interactive` CLI flags.
- `COOKIE.md` — step-by-step guide for extracting the Google abuse-exemption cookie.
- `test.srt` — sample subtitle file for smoke testing.
- CI workflow updated to verify build with `--help` flag.

## [1.0.1] - 2026-02-12

### Added
- `skill.md` — structured instructions for AI CLI tools (Claude Code, Codex CLI, Gemini CLI) (#2).
- "Use with AI CLI Tools" section in README.

## [1.0.0] - 2026-02-12

### Added
- Initial release of `trxsrt` CLI tool (#1).
- SRT file parsing and rebuilding with structure preservation.
- Google Translate (GTX) API integration — no API key required.
- Support for 70+ languages by name or code.
- Concurrent translation with configurable `--concurrency`.
- Retry logic with exponential backoff and jitter.
- `--all-languages` mode to translate to every supported language.
- `--output` flag for custom output directory.
- Real-time progress display.
- GitHub Actions CI/CD pipeline with auto-publish to npm.
- `PUBLISHING.md` — npm publishing guide.
