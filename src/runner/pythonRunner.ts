// Python execution via Pyodide (CPython compiled to WebAssembly).
// The runtime (~10 MB) is lazy-loaded from the CDN on the first Python run
// and cached for the rest of the session.

const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full'

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (options: { batched: (text: string) => void }) => void
  setStderr: (options: { batched: (text: string) => void }) => void
  FS: {
    writeFile: (path: string, data: string, opts?: { encoding: string }) => void
  }
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

export function isPyodideLoaded(): boolean {
  return pyodidePromise !== null
}

async function getPyodide(onStatus: (text: string) => void): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus('First Python run — downloading Pyodide runtime (~10 MB)…')
      await loadScript(`${PYODIDE_BASE}/pyodide.js`)
      if (!window.loadPyodide) {
        throw new Error('Pyodide script loaded but loadPyodide is missing')
      }
      onStatus('Initializing CPython (WebAssembly)…')
      const pyodide = await window.loadPyodide({ indexURL: PYODIDE_BASE })
      onStatus('Python runtime ready! Cached for this session.')
      return pyodide
    })().catch((err) => {
      pyodidePromise = null // allow retry after a failed load
      throw err
    })
  }
  return pyodidePromise
}

export interface RunPythonOptions {
  onStdout: (text: string) => void
  onStderr: (text: string) => void
  onStatus: (text: string) => void
}

/**
 * Run a Python file from the workspace. All workspace .py files are written
 * into Pyodide's in-memory filesystem first, so local imports work.
 */
export async function runPython(
  files: Record<string, string>,
  entry: string,
  { onStdout, onStderr, onStatus }: RunPythonOptions,
): Promise<void> {
  const pyodide = await getPyodide(onStatus)

  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith('.py')) {
      pyodide.FS.writeFile(name, content, { encoding: 'utf8' })
    }
  }

  pyodide.setStdout({ batched: onStdout })
  pyodide.setStderr({ batched: onStderr })

  try {
    await pyodide.runPythonAsync(files[entry] ?? '')
  } catch (err) {
    // Python tracebacks arrive here as a JS error message.
    onStderr(err instanceof Error ? err.message : String(err))
  }
}
