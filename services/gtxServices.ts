import { createInterface } from "readline";
import { CaptchaError } from "../errors/CaptchaError.js";

interface trxTranslate {
    text: string,
    sourceLang: string,
    targetLang: string,
    cookie?: string,
    skipCaptchaErrorFix?: boolean
}

export const gtxServices = {

    async promptForCookie(blockedUrl: string): Promise<string> {
      // Non-interactive environment (CI, automation, piped stdin) — throw instead of hanging
      if (!process.stdin.isTTY) {
        throw new Error(
          `Google requires a CAPTCHA but stdin is not interactive. ` +
          `Solve the CAPTCHA at: ${blockedUrl} ` +
          `then re-run with --cookie <GOOGLE_ABUSE_EXEMPTION=...>`
        );
      }

      const rl = createInterface({ input: process.stdin, output: process.stderr });
      process.stderr.write("\n");
      process.stderr.write("╔══════════════════════════════════════════════════════════════╗\n");
      process.stderr.write("║  Google has detected unusual traffic and requires a CAPTCHA  ║\n");
      process.stderr.write("╚══════════════════════════════════════════════════════════════╝\n");
      process.stderr.write(`\n  Blocked URL:\n  ${blockedUrl}\n\n`);
      process.stderr.write("  1. Open the URL above in your browser\n");
      process.stderr.write("  2. Solve the CAPTCHA\n");
      process.stderr.write("  3. Copy the GOOGLE_ABUSE_EXEMPTION=... cookie\n\n");
      process.stderr.write("  Read more at https://github.com/VasilisPlavos/trxsrt/blob/main/COOKIE.md\n\n");

      return new Promise<string>((resolve) => {
        rl.question("  Paste cookie: ", (answer) => {
          rl.close();
          resolve(answer.trim());
        });
      });

    },

    async translateText({ text, sourceLang, targetLang, cookie, skipCaptchaErrorFix = true }: trxTranslate): Promise<string> {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36", };
        if (cookie) headers["Cookie"] = cookie;

        const response = await fetch(url, { headers });
        if (!response.ok) {

            if (!skipCaptchaErrorFix) {
                const body = await response.text();
                if (
                    // response.headers.get("content-type")?.includes("text/html") ||
                    // body.includes("unusual traffic") ||
                    body.includes("captcha")
                ) {
                    throw new CaptchaError(url);
                }
            }

            const err = new Error(`HTTP error! status: ${response.status}`) as Error & { status?: number };
            err.status = response.status;
            throw err;
        }

        const data = await response.json();
        return (data[0] as unknown[][]).map((part) => part[0]).join("");

    }

}