# Startup CTO Book

A Field Guide to Building Technology Companies from Nothing.

## Local Development

```sh
npm install
npm run build
```

The generated site will be in `build/site/`. Open `build/site/index.html` in a browser to preview.

## Publishing

The site is automatically published to GitHub Pages on push to `main` via GitHub Actions.

> **One-time setup:** Go to **Settings > Pages** in the GitHub repo and set **Source** to **"GitHub Actions"**.

## Keeping it fresh (answer-engine optimisation)

Answer engines favour pages that are current, answer the question up front, and agree with each other. Every quarter:

1. Re-check the research the chapters cite and update figures that have moved; note corrections in `changelog.adoc`.
2. Bump `:page-date-modified:` on every page you change. It drives the visible "Last updated" line, the JSON-LD `dateModified` and the sitemap `<lastmod>`.
3. Check each changed chapter's `[.in-short]` answer and `:page-search-title:` still match the body.
4. Run the prompt panel: ask the tracked questions in ChatGPT, Perplexity, Google AI Mode, Gemini and Claude, and note whether the book is cited.

Conventions: `:page-search-title:` sets the HTML `<title>`; `[.in-short]` is a 40–60 word self-contained answer under the chapter title; concept pages set `:page-schema: term` with `:page-term-name:` and `:page-term-definition:`, and `key-concepts.adoc` is the term set. See the `book-aeo` skill in book-kit.
