# trxsrt

[![npm](https://img.shields.io/npm/v/trxsrt)](https://www.npmjs.com/package/trxsrt)

A free command-line tool for translating SRT subtitle files. No API key required. Supports 70+ languages.

🦞 OpenClaw-ready — OpenClaw and AI CLI tools like Claude Code, Codex CLI, and Gemini CLI can [learn it as a skill](#use-with-ai-cli-tools) and use it whenever you ask.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Usage](#usage)
  - [Arguments](#arguments)
  - [Examples](#examples)
  - [Output Files](#output-files)
  - [Progress Display](#progress-display)
- [Use with AI CLI Tools](#use-with-ai-cli-tools)
- [Supported Languages](#supported-languages)
- [How It Works](#how-it-works)
- [Error Handling](#error-handling)
- [Notes](#notes)

## Prerequisites

- Node.js >= 20.9.0

## Usage

```bash
npx trxsrt <file.srt> -f <language> -t <language>
npx trxsrt <file.srt> -f <language> --all-languages
```

### Arguments

| Argument            | Short | Description                                                        |
| ------------------- | ----- | ------------------------------------------------------------------ |
| `<file>`            |       | SRT file path (required, must be `.srt`)                           |
| `--from <language>` | `-f`  | Source language — name or code (required)                          |
| `--to <language>`   | `-t`  | Target language — name or code (required unless `--all-languages`) |
| `--all-languages`   | `-a`  | Translate to all supported languages (excludes source)             |
| `--concurrency <n>` | `-c`  | Max concurrent API requests (default: `10`)                        |
| `--output <dir>`    | `-o`  | Output directory (default: same directory as input file)           |

### Examples

Translate to Greek using language name:

```bash
npx trxsrt movie.srt -f english -t greek
```

Translate to Greek using language code:

```bash
npx trxsrt movie.srt -f en -t el
```

Translate to all languages, output to a custom directory:

```bash
npx trxsrt movie.srt -f en --all-languages -o ./translated
```

Lower concurrency to avoid rate limits:

```bash
npx trxsrt movie.srt -f en -t el -c 5
```

### Output Files

Output files are named `<filename>.<lang-code>.srt` and placed in the same directory as the input file (or the directory specified by `--output`).

```bash
movie.srt           # input
movie.el.srt        # Greek output
movie.ja.srt        # Japanese output
movie.zh-hant.srt   # Traditional Chinese output
```

### Progress Display

The tool shows real-time progress for each language:

```bash
Parsed 120 subtitle lines from movie.srt
Translating from English (en) to 1 language(s)

[1/1] Greek (el)
  [el] Translating... 45/120 lines
```

When translating to all languages, a final summary is shown:

```bash
Done! 85 succeeded, 0 failed.
```

## Use with AI CLI Tools

If you use an AI-powered CLI (like Claude Code, Copilot CLI, etc.), you can feed the tool instructions directly:

The [`skill.md`](skill.md) file contains structured instructions that help LLMs understand how to use `trxsrt` on your behalf. You can pipe it into any AI-powered CLI:

**Claude Code:**

```bash
read  https://raw.githubusercontent.com/VasilisPlavos/trxsrt/main/skill.md and learn how to translate subtitles
```

**OpenAI Codex CLI:**

```bash
read  https://raw.githubusercontent.com/VasilisPlavos/trxsrt/main/skill.md and learn how to translate subtitles
```

**Google Gemini CLI:**

```bash
read  https://raw.githubusercontent.com/VasilisPlavos/trxsrt/main/skill.md and learn how to translate subtitles
```

Or simply paste the URL into any AI chat and ask it to translate your subtitles.

## Supported Languages

Languages can be specified by full name (case-insensitive) or code.

| Code      | Language              | Code | Language    |
| --------- | --------------------- | ---- | ----------- |
| `en`      | English               | `nl` | Dutch       |
| `el`      | Greek                 | `he` | Hebrew      |
| `zh`      | Simplified Chinese    | `sv` | Swedish     |
| `zh-hant` | Traditional Chinese   | `da` | Danish      |
| `es`      | Spanish               | `nb` | Norwegian   |
| `de`      | German                | `is` | Icelandic   |
| `pt-br`   | Portuguese (Brazil)   | `af` | Afrikaans   |
| `pt-pt`   | Portuguese (Portugal) | `ro` | Romanian    |
| `fr`      | French                | `ca` | Catalan     |
| `ja`      | Japanese              | `uk` | Ukrainian   |
| `ko`      | Korean                | `pl` | Polish      |
| `ru`      | Russian               | `cs` | Czech       |
| `it`      | Italian               | `sk` | Slovak      |
| `ar`      | Arabic                | `bg` | Bulgarian   |
| `vi`      | Vietnamese            | `sr` | Serbian     |
| `hi`      | Hindi                 | `hr` | Croatian    |
| `id`      | Indonesian            | `bs` | Bosnian     |
| `yue`     | Cantonese             | `sl` | Slovenian   |
| `mk`      | Macedonian            | `ka` | Georgian    |
| `be`      | Belarusian            | `tr` | Turkish     |
| `hu`      | Hungarian             | `fa` | Persian     |
| `fi`      | Finnish               | `ur` | Urdu        |
| `lt`      | Lithuanian            | `uz` | Uzbek       |
| `lv`      | Latvian               | `kk` | Kazakh      |
| `et`      | Estonian              | `ky` | Kyrgyz      |
| `sq`      | Albanian              | `tk` | Turkmen     |
| `mt`      | Maltese               | `az` | Azerbaijani |
| `hy`      | Armenian              | `tg` | Tajik       |
| `mn`      | Mongolian             | `ta` | Tamil       |
| `bn`      | Bengali               | `te` | Telugu      |
| `mr`      | Marathi               | `gu` | Gujarati    |
| `kn`      | Kannada               | `pa` | Punjabi     |
| `ml`      | Malayalam             | `ne` | Nepali      |
| `bho`     | Bhojpuri              | `lo` | Lao         |
| `th`      | Thai                  | `my` | Burmese     |
| `ms`      | Malay                 | `jv` | Javanese    |
| `fil`     | Filipino (Tagalog)    | `sw` | Swahili     |
| `ha`      | Hausa                 | `ug` | Uyghur      |
| `am`      | Amharic               |      |             |

## How It Works

1. **Parse** — The SRT file is read and split into structural lines (subtitle numbers, timecodes, blank lines) and content lines. Only content lines are sent for translation; the SRT structure is preserved exactly.

2. **Translate** — Each content line is translated individually. Requests run concurrently (default 10 at a time) using `p-limit`.

3. **Retry** — Failed requests are retried up to 3 times with exponential backoff (2s base, 2x factor, 60s max, randomized jitter). Network errors, 5xx, and 429 responses are retried. Auth errors (401, 403) are not.

4. **Rebuild** — Translated lines are placed back into the original SRT structure at their original positions, preserving subtitle numbers, timecodes, and formatting.

5. **Write** — The translated SRT is written to disk. In multi-language mode, each file is written as soon as its translation completes, with a 500ms delay between languages.

## Error Handling

- Invalid file path or non-`.srt` extension: exits with an error message
- Unrecognized language name/code: exits with the full list of available languages
- Translation API failures: retried automatically, with per-language error reporting in the final summary
- If any languages fail in `--all-languages` mode, the tool exits with code 1 and lists all failures

## Notes

- Completely free — no API key or account needed.
- Rate limits may apply on heavy usage — lower the `--concurrency` value if you encounter 429 errors.
- Only `.srt` files are supported.
