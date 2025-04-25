# YAML Shredder POC

A proof-of-concept web app to convert GitHub Actions YAML to Dagger pipelines (Go, Python, TypeScript).

## Purpose

Paste a CI/CD YAML (e.g., GitHub Actions) and instantly see an equivalent Dagger pipeline in Go, Python, or TypeScript.

## Run locally

```sh
npm install
npm run dev
```

## Caveats
- MVP conversion uses heuristics and OpenAI for unmapped steps.
- No server-side secrets; OpenAI key must be user-supplied or use a public proxy for POC.
- Bundle size < 500kB (Monaco dynamically loaded).
- Fails gracefully if conversion fails.

## Demo

![Demo](public/demo.gif)

## References
- [Dagger Docs](https://docs.dagger.io/integrations/github-actions/)
- [Tutorial: migrate GH Actions to Dagger](https://labs.iximiuz.com/en/posts/running-dagger-pipelines-on-github-actions-3ce5f37d)
- [Blog: Dagger vs YAML](https://alfonsofortunato.com/posts/dagger/)
