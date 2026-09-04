# Authentication — napejs.org

**None required.** Everything on this site — documentation, interactive
demos, benchmarks, `llms.txt` / `llms-full.txt`, and the TypeDoc API
reference — is fully public. There are no accounts, logins, API keys,
rate-limit tokens, or paywalls.

## For AI agents and automated clients

- Read the machine-readable docs directly:
  - https://napejs.org/llms.txt — overview + quick start
  - https://napejs.org/llms-full.txt — complete API reference
- Discover resources via https://napejs.org/.well-known/api-catalog (RFC 9727).
- Crawl preferences are declared in https://napejs.org/robots.txt
  (Content Signals: `search=yes, ai-input=yes, ai-train=yes`).

## Using the library programmatically

The software itself is a free, MIT-licensed npm package — no registration:

```
npm install @newkrok/nape-js
```

It runs headless in Node.js, Bun, Deno, or a Web Worker (zero DOM
dependencies), so agents can install it and step simulations directly.
