# Publishing to npm

## Prerequisites

- You must be logged in to npm: `npm login`
- Your npm account needs an **Automation** token configured (to bypass 2FA)

## Steps

### 1. Bump the version

Pick the appropriate version bump:

```bash
npm version patch   # bug fixes:        1.0.0 → 1.0.1
npm version minor   # new features:     1.0.0 → 1.1.0
npm version major   # breaking changes: 1.0.0 → 2.0.0
```

This updates `version` in `package.json` automatically.

### 2. Build and publish

```bash
npm publish
```

TypeScript is compiled automatically before publishing via the `prepublishOnly` script.

### 3. Verify

```bash
npm view trxsrt version
```

## Quick reference (copy-paste)

```bash
npm version patch && npm publish
```
