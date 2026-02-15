# How to get the Google abuse-exemption cookie

When Google rate-limits the translation API it returns a CAPTCHA page instead
of the normal response. The console will print the blocked URL. Follow these
steps to unblock yourself:

1. **Open the URL** printed in the console in your browser.
2. **Solve the CAPTCHA** that Google presents.
3. Open **DevTools** (F12) → **Network** tab.
4. Refresh the page and click the first request.
5. In the **Request Headers** section, find the `Cookie` header.
6. Copy the `GOOGLE_ABUSE_EXEMPTION=...` value (just that part).
7. Paste it back in the terminal when prompted.

The cookie will be reused for all remaining languages in the current run.
