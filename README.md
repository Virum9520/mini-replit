# ⛏ Mini-Replit — a Minecraft-Themed Browser IDE

**Live demo:** https://virum9520.github.io/mini-replit/
**Access password:** `For_Replit`

A Replit-inspired IDE that runs **entirely in the browser** — Monaco editor,
real Python and JavaScript execution, and an AI-style **Cloud Architect** that
designs AWS architectures live as you tweak requirements. All of it skinned as
a Minecraft server, because portfolio projects should be fun to open.

Built as a portfolio project for Replit's SDE New Grad role.

---

## Why this project (for the Replit team)

- **It mirrors your product.** File tree, editor tabs, a Run button, a console,
  and a deployments advisor — the core loop of Replit, reimplemented small.
- **It mirrors your stack.** TypeScript + React on the front end, with an
  emphasis on making code execution feel instant.
- **It takes "run code in the browser" seriously.** No backend anywhere: the
  whole thing is static files on GitHub Pages, yet it executes real CPython
  and sandboxed JavaScript.

## How code execution works

**JavaScript / HTML** — the workspace is compiled into a single self-contained
document: local `<script src>` and stylesheet references are inlined from the
in-memory file system, a console shim is injected, and the result is rendered
in an iframe with `sandbox="allow-scripts"` (no same-origin access). The shim
forwards `console.*` calls, runtime errors, and unhandled rejections to the
host app via `postMessage`, where they render in a Minecraft-chat-styled
console.

**Python** — [Pyodide](https://pyodide.org) (CPython compiled to WebAssembly)
is lazy-loaded from the CDN on the first run (~10 MB, cached for the session),
so users who never run Python never pay for it. Workspace `.py` files are
written into Pyodide's in-memory filesystem so local imports work, and
stdout/stderr are piped straight into the console pane.

**Persistence** — the workspace lives in `localStorage` with starter templates
(Python, HTML/JS, notes), so edits survive reloads with zero infrastructure.

## The Cloud Architect ("AI Deploy Advisor")

The differentiator. Open **☁ Cloud Architect** in the header and the advisor:

1. **Analyzes your workspace** — languages, total size, and server-ish signals
   (Flask/FastAPI/Django/Express imports, `app.listen`, WebSocket servers…).
2. **Takes your requirements** — a log-scale traffic slider (1 → 10,000 RPS),
   toggles for database / realtime / global users, and a budget tier.
3. **Recommends an AWS architecture** and renders it as a live SVG diagram
   that **morphs** as you move the sliders:
   - Static site → **S3 + CloudFront**
   - Low-traffic API → **API Gateway + Lambda + DynamoDB**
   - High traffic → **ALB + ECS Fargate + RDS + ElastiCache**, Multi-AZ
   - Global users → **Route 53 + CloudFront + second-region replica**
4. **Explains itself** — chat-style reasoning lines, a per-component "why",
   and a monthly cost tier for every recommendation.

It's presented as an AI advisor, but it's a **deterministic heuristics
engine** — pure TypeScript, no LLM, no API keys. Every recommendation is
reproducible and explainable, and it works on a static host forever.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Vite + React 18 + TypeScript |
| Editor | Monaco via `@monaco-editor/react`, custom Minecraft theme |
| Python runtime | Pyodide (WebAssembly), lazy-loaded from CDN |
| JS sandbox | `iframe[sandbox=allow-scripts]` + `postMessage` console bridge |
| Styling | Hand-written CSS — "Press Start 2P" font, beveled panels, dirt/stone/grass palette |
| CI/CD | GitHub Actions → GitHub Pages on every push to `main` |

## Running locally

```bash
npm install
npm run dev     # http://localhost:5173/mini-replit/
npm run build   # type-check + production build
```

Password on the gate: `For_Replit` (client-side only — it's a portfolio
gate, not security).

## Project structure

```
src/
  components/     PasswordGate, Ide, FileTree, ConsolePane, CloudArchitect
  runner/         webRunner (iframe builds), pythonRunner (Pyodide)
  architect/      heuristics engine + morphing SVG diagram
  hooks/          useWorkspace (localStorage-backed file system)
  workspace.ts    starter templates + persistence
```

---

*Not affiliated with Mojang or Replit — a fan-made portfolio project.*
