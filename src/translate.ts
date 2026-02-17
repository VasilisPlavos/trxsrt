#!/usr/bin/env node
import { program } from "commander";
import Conf from "conf";
import { SourceLanguage, TargetLanguage } from "deeplx";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import pLimit from "p-limit";
import { resolve, dirname, basename, extname, join } from "path";

import { CaptchaError } from "./errors/CaptchaError.js";
import { deepLxServices } from "./services/deepLxServices.js";
import { gtxServices } from "./services/gtxServices.js";

// ── Language Data (from languages-data.ts, excluding "auto") ────────────────

interface Language {
  value: string;
  name: string;
}

//autocorrect:false
const LANGUAGES: Language[] = [
  { value: "en", name: "English" },
  { value: "el", name: "Greek" },
  { value: "zh", name: "Simplified Chinese" },
  { value: "zh-hant", name: "Traditional Chinese" },
  { value: "es", name: "Spanish" },
  { value: "de", name: "German" },
  { value: "pt-br", name: "Portuguese (Brazil)" },
  { value: "pt-pt", name: "Portuguese (Portugal)" },
  { value: "fr", name: "French" },
  { value: "ja", name: "Japanese" },
  { value: "ko", name: "Korean" },
  { value: "ru", name: "Russian" },
  { value: "it", name: "Italian" },
  { value: "ar", name: "Arabic" },
  { value: "vi", name: "Vietnamese" },
  { value: "hi", name: "Hindi" },
  { value: "id", name: "Indonesian" },
  { value: "yue", name: "Cantonese" },
  { value: "nl", name: "Dutch" },
  { value: "sv", name: "Swedish" },
  { value: "da", name: "Danish" },
  { value: "nb", name: "Norwegian" },
  { value: "is", name: "Icelandic" },
  { value: "af", name: "Afrikaans" },
  { value: "ro", name: "Romanian" },
  { value: "ca", name: "Catalan" },
  { value: "uk", name: "Ukrainian" },
  { value: "pl", name: "Polish" },
  { value: "cs", name: "Czech" },
  { value: "sk", name: "Slovak" },
  { value: "bg", name: "Bulgarian" },
  { value: "sr", name: "Serbian" },
  { value: "hr", name: "Croatian" },
  { value: "bs", name: "Bosnian" },
  { value: "sl", name: "Slovenian" },
  { value: "mk", name: "Macedonian" },
  { value: "be", name: "Belarusian" },
  { value: "hu", name: "Hungarian" },
  { value: "fi", name: "Finnish" },
  { value: "lt", name: "Lithuanian" },
  { value: "lv", name: "Latvian" },
  { value: "et", name: "Estonian" },
  { value: "sq", name: "Albanian" },
  { value: "mt", name: "Maltese" },
  { value: "hy", name: "Armenian" },
  { value: "ka", name: "Georgian" },
  { value: "tr", name: "Turkish" },
  { value: "he", name: "Hebrew" },
  { value: "fa", name: "Persian" },
  { value: "ur", name: "Urdu" },
  { value: "uz", name: "Uzbek" },
  { value: "kk", name: "Kazakh" },
  { value: "ky", name: "Kyrgyz" },
  { value: "tk", name: "Turkmen" },
  { value: "az", name: "Azerbaijani" },
  { value: "tg", name: "Tajik" },
  { value: "mn", name: "Mongolian" },
  { value: "bn", name: "Bengali" },
  { value: "mr", name: "Marathi" },
  { value: "ta", name: "Tamil" },
  { value: "te", name: "Telugu" },
  { value: "gu", name: "Gujarati" },
  { value: "kn", name: "Kannada" },
  { value: "ml", name: "Malayalam" },
  { value: "pa", name: "Punjabi" },
  { value: "ne", name: "Nepali" },
  { value: "bho", name: "Bhojpuri" },
  { value: "th", name: "Thai" },
  { value: "lo", name: "Lao" },
  { value: "my", name: "Burmese" },
  { value: "ms", name: "Malay" },
  { value: "fil", name: "Filipino (Tagalog)" },
  { value: "jv", name: "Javanese" },
  { value: "sw", name: "Swahili" },
  { value: "ha", name: "Hausa" },
  { value: "am", name: "Amharic" },
  { value: "ug", name: "Uyghur" },
];

function resolveLanguage(input: string): Language | undefined {
  const lower = input.toLowerCase();
  return LANGUAGES.find(
    (l) => l.value.toLowerCase() === lower || l.name.toLowerCase() === lower
  );
}

// ── SRT Parsing ─────────────────────────────────────────────────────────────

const INTEGER_REGEX = /^\d+$/;
const SRT_TIMECODE_REGEX = /^[\d:,]+ --> [\d:,]+$/;

interface ParsedSRT {
  lines: string[];
  contentIndices: number[];
  contentLines: string[];
}

function parseSRT(text: string): ParsedSRT {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const contentLines: string[] = [];
  const contentIndices: number[] = [];
  let startExtracting = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!startExtracting) {
      if (SRT_TIMECODE_REGEX.test(trimmed)) {
        startExtracting = true;
      }
      continue;
    }

    if (SRT_TIMECODE_REGEX.test(trimmed)) continue;
    if (trimmed === "" || INTEGER_REGEX.test(trimmed)) continue;

    contentLines.push(lines[i]);
    contentIndices.push(i);
  }

  return { lines, contentIndices, contentLines };
}

function rebuildSRT(
  originalLines: string[],
  contentIndices: number[],
  translatedLines: string[]
): string {
  const output = [...originalLines];
  for (let i = 0; i < contentIndices.length; i++) {
    output[contentIndices[i]] = translatedLines[i];
  }
  return output.join("\n");
}


// ── Retry Logic ─────────────────────────────────────────────────────────────

const retry = {
  count: 3,
  factor: 2,
  min: 2000,
  max: 60000
}

const circuitBreaker = {
  consecutiveFailures: 0,
  MAX_CONSECUTIVE_FAILURES: 100,
};

function isRetryable(error: unknown): boolean {
  if (error instanceof CaptchaError) return false;
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403) return false;
  return !status || status >= 500 || status === 429;
}

const getBackoffDelay = (attempt: number) => {
  const base = retry.min * Math.pow(retry.factor, attempt);
  const jitter = 0.5 + Math.random() * 0.5;
  return Math.min(base, retry.max) * jitter;
};

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= retry.count; attempt++) {
    try {
      const result = await fn();
      circuitBreaker.consecutiveFailures = 0;
      return result;
    } catch (err) {
      circuitBreaker.consecutiveFailures++;
      if (circuitBreaker.consecutiveFailures >= circuitBreaker.MAX_CONSECUTIVE_FAILURES) {
        throw new Error("CIRCUIT_BREAKER_HALT");
      }

      const isLastAttempt = attempt === retry.count;
      if (isLastAttempt || !isRetryable(err)) throw err;

      const delay = getBackoffDelay(attempt);
      process.stderr.write(`  Retry ${attempt + 1}/${retry.count} in ${Math.round(delay)}ms...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unexpected retry loop exit");
}
// ── Core Translation ────────────────────────────────────────────────────────

let serviceCounter = 0;

function nextService(): "gtx" | "deeplx" {
  return serviceCounter++ % 2 === 0 ? "gtx" : "deeplx";
}

async function translateSRT(
  parsed: ParsedSRT,
  sourceLang: SourceLanguage,
  targetLang: TargetLanguage,
  concurrency: number,
  cookie?: string
): Promise<string> {
  const { contentLines, contentIndices, lines } = parsed;
  const translatedLines = new Array<string>(contentLines.length);
  const limit = pLimit(concurrency);
  let completed = 0;
  const total = contentLines.length;

  const writeProgress = () => {
    process.stderr.write(
      `\r  [${targetLang}] Translating... ${completed}/${total} lines`
    );
  };

  writeProgress();

  const tasks = contentLines.map((line, i) =>
    limit(async () => {
      translatedLines[i] = await withRetry(() => {
        const service = nextService();
        return service === "gtx"
          ? gtxServices.translateText({ sourceLang, targetLang, text: line, cookie })
          : deepLxServices.translateText({ sourceLang, targetLang, text: line });
      });
      completed++;
      writeProgress();
    })
  );

  await Promise.all(tasks);
  process.stderr.write(
    `\r  [${targetLang}] Done: ${total}/${total} lines         \n`
  );

  return rebuildSRT(lines, contentIndices, translatedLines);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

program
  .name("trxsrt")
  .description("Translate SRT subtitle files using Google Translate (GTX) and DeepLX")
  .argument("<file>", "SRT file to translate")
  .requiredOption("-f, --from <language>", "Source language (name or code)")
  .option("-t, --to <language>", "Target language (name or code)")
  .option("-a, --all-languages", "Translate to all supported languages")
  .option("-c, --concurrency <number>", "Max concurrent requests", "10")
  .option(
    "-o, --output <directory>",
    "Output directory (default: same as input)"
  )
  .option("--cookie <cookie>", "Google abuse exemption cookie (GOOGLE_ABUSE_EXEMPTION=...)")
  .option("--non-interactive", "Exit with error on CAPTCHA instead of prompting")
  .action(
    async (
      file: string,
      opts: {
        from: string;
        to?: string;
        allLanguages?: boolean;
        concurrency: string;
        output?: string;
        cookie?: string;
        nonInteractive?: boolean;
      }
    ) => {
      // Validate file
      const filePath = resolve(file);
      if (extname(filePath).toLowerCase() !== ".srt") {
        console.error("Error: Input file must be an .srt file");
        process.exit(1);
      }
      if (!existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      // Validate language options
      if (!opts.to && !opts.allLanguages) {
        console.error(
          "Error: Must specify --to <language> or --all-languages"
        );
        process.exit(1);
      }

      const sourceLang = resolveLanguage(opts.from);
      if (!sourceLang) {
        console.error(`Error: Unknown source language "${opts.from}"`);
        console.error(
          "Available languages:",
          LANGUAGES.map((l) => `${l.name} (${l.value})`).join(", ")
        );
        process.exit(1);
      }

      const concurrency = parseInt(opts.concurrency, 10);
      if (isNaN(concurrency) || concurrency < 1) {
        console.error("Error: Concurrency must be a positive number");
        process.exit(1);
      }

      // Determine output dir
      const outputDir = opts.output
        ? resolve(opts.output)
        : dirname(filePath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const fileBase = basename(filePath, ".srt");

      // Read and parse SRT
      const content = readFileSync(filePath, "utf-8");
      const parsed = parseSRT(content);

      if (parsed.contentLines.length === 0) {
        console.error("Error: No translatable content found in SRT file");
        process.exit(1);
      }

      console.log(
        `Parsed ${parsed.contentLines.length} subtitle lines from ${basename(filePath)}`
      );

      // Build target list
      let targets: Language[];
      if (opts.allLanguages) {
        targets = LANGUAGES.filter(
          (l) => l.value !== sourceLang.value
        );
      } else {
        const targetLang = resolveLanguage(opts.to!);
        if (!targetLang) {
          console.error(`Error: Unknown target language "${opts.to}"`);
          console.error(
            "Available languages:",
            LANGUAGES.map((l) => `${l.name} (${l.value})`).join(", ")
          );
          process.exit(1);
        }
        targets = [targetLang];
      }

      console.log(
        `Translating from ${sourceLang.name} (${sourceLang.value}) to ${targets.length} language(s)\n`
      );

      // Resolve cookie: --cookie flag > stored cookie > none
      const config = new Conf({ projectName: "trxsrt" });
      let cookie = opts.cookie || (config.get("cookie") as string | undefined);
      if (cookie) console.log("Using saved cookie from previous session");

      // Preflight: test a single request to check for CAPTCHA before bulk translation
      console.log("Checking API access...");
      try {
        const skipCaptchaErrorFix = opts.nonInteractive ? true : false;
        const targetLang = targets[0].value as TargetLanguage
        await gtxServices.translateText({ text: "hello", sourceLang: sourceLang.value as SourceLanguage, targetLang, cookie, skipCaptchaErrorFix });
        console.log("API access OK\n");
      } catch (err) {
        if (err instanceof CaptchaError) {
          cookie = await gtxServices.promptForCookie(err.url);
          config.set("cookie", cookie);
          console.log("Cookie saved for future runs\n");
        } else {
          throw err;
        }
      }

      // Translate each target
      const results: { lang: Language; success: boolean; error?: string }[] = [];

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        console.log(
          `[${i + 1}/${targets.length}] ${target.name} (${target.value})`
        );

        try {
          const translated = await translateSRT(
            parsed,
            sourceLang.value as SourceLanguage,
            target.value as TargetLanguage,
            concurrency,
            cookie
          );
          const outPath = join(outputDir, `${fileBase}.${target.value}.srt`);
          writeFileSync(outPath, translated, "utf-8");
          results.push({ lang: target, success: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          process.stderr.write(`\n  Error: ${msg}\n`);
          results.push({ lang: target, success: false, error: msg });
        }

        // Delay between languages in multi-language mode
        if (targets.length > 1 && i < targets.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Summary
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      console.log(`\nDone! ${succeeded} succeeded, ${failed} failed.`);

      if (failed > 0) {
        console.log("Failed languages:");
        for (const r of results.filter((r) => !r.success)) {
          console.log(`  - ${r.lang.name} (${r.lang.value}): ${r.error}`);
        }
        process.exit(1);
      }
    }
  );

program.parse();
