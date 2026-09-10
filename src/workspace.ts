// Workspace model: a flat set of named files persisted to localStorage.

export type Language =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'markdown'
  | 'json'
  | 'plaintext'

export interface WorkspaceState {
  files: Record<string, string>
  openTabs: string[]
  activeFile: string | null
}

const STORAGE_KEY = 'mini-replit-workspace-v1'

export function languageFor(name: string): Language {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'py':
      return 'python'
    case 'js':
    case 'mjs':
      return 'javascript'
    case 'ts':
      return 'typescript'
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'md':
      return 'markdown'
    case 'json':
      return 'json'
    default:
      return 'plaintext'
  }
}

const STARTER_MAIN_PY = `# main.py — runs in your browser via Pyodide (WebAssembly)
# Press the Run button to execute!

def mine(block, count):
    pickaxe = "\\u26cf"
    for i in range(1, count + 1):
        print(f"{pickaxe} mined {block} x{i}")

mine("diamond", 3)

inventory = {"diamond": 3, "dirt": 64, "cobblestone": 128}
total = sum(inventory.values())
print(f"\\nInventory: {inventory}")
print(f"Total blocks: {total}")
`

const STARTER_INDEX_HTML = `<!doctype html>
<html>
  <head>
    <style>
      body {
        background: #1b1b1b;
        color: #7cbd4f;
        font-family: monospace;
        padding: 2rem;
      }
      h1 { color: #fcfc54; }
    </style>
  </head>
  <body>
    <h1>Hello from the preview pane!</h1>
    <p>Edit this file and press Run to refresh.</p>
    <div id="out"></div>
    <script src="script.js"></script>
  </body>
</html>
`

const STARTER_SCRIPT_JS = `// script.js — runs in a sandboxed iframe.
// console.log output is captured into the console pane below.

const blocks = ['grass', 'dirt', 'stone', 'diamond ore']

for (const block of blocks) {
  console.log('Generated chunk with ' + block)
}

const out = document.getElementById('out')
if (out) {
  out.textContent = 'Blocks generated: ' + blocks.length
}
`

const STARTER_NOTES_MD = `# Welcome to Mini-Replit!

A Minecraft-themed IDE that runs entirely in your browser.

- **main.py** — Python, executed with Pyodide (WebAssembly)
- **index.html + script.js** — rendered live in the preview pane
- Files persist in localStorage. Create, rename, delete at will.
- Open the **Cloud Architect** to plan an AWS deployment for this workspace.
`

export function starterWorkspace(): WorkspaceState {
  return {
    files: {
      'main.py': STARTER_MAIN_PY,
      'index.html': STARTER_INDEX_HTML,
      'script.js': STARTER_SCRIPT_JS,
      'NOTES.md': STARTER_NOTES_MD,
    },
    openTabs: ['main.py'],
    activeFile: 'main.py',
  }
}

export function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return starterWorkspace()
    const parsed = JSON.parse(raw) as WorkspaceState
    if (!parsed.files || Object.keys(parsed.files).length === 0) {
      return starterWorkspace()
    }
    return parsed
  } catch {
    return starterWorkspace()
  }
}

export function saveWorkspace(state: WorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — non-fatal.
  }
}
