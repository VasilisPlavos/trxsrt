export class CaptchaError extends Error {
  url: string;
  constructor(url: string) {
    super("Google returned a CAPTCHA challenge (unusual traffic detected)");
    this.name = "CaptchaError";
    this.url = url;
  }
}
