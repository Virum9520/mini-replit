import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { type Monaco } from '@monaco-editor/react'
import { useWorkspace } from '../hooks/useWorkspace'
import { languageFor } from '../workspace'
import {
  RUNNER_MESSAGE_SOURCE,
  type ConsoleLevel,
  type ConsoleMessage,
  type RunnerPostMessage,
} from '../runner/types'
import { buildHtmlDoc, buildJsDoc } from '../runner/webRunner'
import { runPython } from '../runner/pythonRunner'
import FileTree from './FileTree'
import ConsolePane from './ConsolePane'
import CloudArchitect from './CloudArchitect'
import './Ide.css'

function defineMinecraftTheme(monaco: Monaco) {
  monaco.editor.defineTheme('minecraft', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7cbd4f' },
      { token: 'string', foreground: 'fcfc54' },
      { token: 'keyword', foreground: '54fcfc' },
      { token: 'number', foreground: 'fc8154' },
      { token: 'type', foreground: 'b054fc' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.lineHighlightBackground': '#2a2a2a',
      'editorLineNumber.foreground': '#555555',
      'editorCursor.foreground': '#7cbd4f',
    },
  })
}

let messageId = 0

export default function Ide() {
  const workspace = useWorkspace()
  const { state, setActive, closeTab, updateContent } = workspace
  const active = state.activeFile

  const [messages, setMessages] = useState<ConsoleMessage[]>([])
  const [previewDoc, setPreviewDoc] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const pushMessage = useCallback((level: ConsoleLevel, text: string) => {
    setMessages((prev) => [...prev, { id: messageId++, level, text }])
  }, [])

  // Receive console output forwarded from the sandboxed iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as RunnerPostMessage | undefined
      if (data?.source !== RUNNER_MESSAGE_SOURCE) return
      pushMessage(data.level, data.text)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [pushMessage])

  const [pythonRunning, setPythonRunning] = useState(false)
  const [architectOpen, setArchitectOpen] = useState(false)
  const runningRef = useRef(false)

  const handleRun = useCallback(async () => {
    if (!active || runningRef.current) return
    const lang = languageFor(active)

    if (lang === 'html') {
      pushMessage('system', `Running ${active} …`)
      setPreviewDoc(buildHtmlDoc(state.files, active))
      setPreviewKey((k) => k + 1)
    } else if (lang === 'javascript') {
      // If an HTML file references this script, run the page for full context.
      const htmlEntry = Object.keys(state.files).find(
        (name) =>
          languageFor(name) === 'html' && state.files[name].includes(active),
      )
      if (htmlEntry) {
        pushMessage('system', `Running ${htmlEntry} (references ${active}) …`)
        setPreviewDoc(buildHtmlDoc(state.files, htmlEntry))
      } else {
        pushMessage('system', `Running ${active} …`)
        setPreviewDoc(buildJsDoc(state.files, active))
      }
      setPreviewKey((k) => k + 1)
    } else if (lang === 'python') {
      runningRef.current = true
      setPythonRunning(true)
      pushMessage('system', `Running ${active} …`)
      try {
        await runPython(state.files, active, {
          onStdout: (text) => pushMessage('log', text),
          onStderr: (text) => pushMessage('error', text),
          onStatus: (text) => pushMessage('system', text),
        })
        pushMessage('system', `${active} finished.`)
      } catch (err) {
        pushMessage(
          'error',
          `Failed to run Python: ${err instanceof Error ? err.message : String(err)}`,
        )
      } finally {
        runningRef.current = false
        setPythonRunning(false)
      }
    } else {
      pushMessage('warn', `Cannot run ${active} — try a .py, .js or .html file.`)
    }
  }, [active, state.files, pushMessage])

  return (
    <div className="ide">
      <header className="ide-header mc-panel-dirt">
        <div className="ide-logo">
          <span className="ide-logo-block" aria-hidden />
          <span>
            MINI<span className="ide-logo-accent">REPLIT</span>
          </span>
        </div>
        <div className="ide-header-right">
          <span className="ide-header-hint mc-dim">
            {active ? languageFor(active) : 'no file'}
          </span>
          <button
            className="mc-button ide-architect-btn"
            onClick={() => setArchitectOpen(true)}
            title="Open the AI Deploy Advisor"
          >
            ☁ CLOUD ARCHITECT
          </button>
          <button
            className="mc-button mc-button-green ide-run"
            onClick={handleRun}
            disabled={!active || pythonRunning}
            title="Run the active file"
          >
            {pythonRunning ? '⛏ MINING…' : '▶ RUN'}
          </button>
        </div>
      </header>

      <div className="ide-body">
        <aside className="ide-sidebar mc-panel">
          <FileTree workspace={workspace} />
        </aside>

        <main className="ide-main">
          <div className="ide-tabs">
            {state.openTabs.map((name) => (
              <div
                key={name}
                className={`ide-tab ${name === active ? 'active' : ''}`}
                onClick={() => setActive(name)}
              >
                <span className="ide-tab-name">{name}</span>
                <button
                  className="ide-tab-close"
                  title="Close tab"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(name)
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {state.openTabs.length === 0 && (
              <div className="ide-tab-empty mc-dim">
                open a file from the chest →
              </div>
            )}
          </div>

          <div className="ide-editor mc-panel">
            {active !== null && state.files[active] !== undefined ? (
              <Editor
                path={active}
                language={languageFor(active)}
                value={state.files[active]}
                theme="minecraft"
                beforeMount={defineMinecraftTheme}
                onChange={(value) => updateContent(active, value ?? '')}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  tabSize: 4,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
              />
            ) : (
              <div className="ide-editor-empty">
                <p className="mc-dim">No file open.</p>
                <p className="mc-dim">Select one from the chest on the left.</p>
              </div>
            )}
          </div>
        </main>

        <section className="ide-right">
          <div className="ide-preview mc-panel">
            <div className="ide-preview-header">
              <span className="ide-preview-title">PREVIEW</span>
            </div>
            {previewDoc !== null ? (
              <iframe
                key={previewKey}
                className="ide-preview-frame"
                title="Preview"
                sandbox="allow-scripts"
                srcDoc={previewDoc}
              />
            ) : (
              <div className="ide-preview-empty mc-dim">
                Run an HTML or JS file to see it here.
              </div>
            )}
          </div>
          <div className="ide-console mc-panel">
            <ConsolePane messages={messages} onClear={() => setMessages([])} />
          </div>
        </section>
      </div>

      {architectOpen && (
        <CloudArchitect
          files={state.files}
          onClose={() => setArchitectOpen(false)}
        />
      )}
    </div>
  )
}
