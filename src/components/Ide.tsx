import Editor, { type Monaco } from '@monaco-editor/react'
import { useWorkspace } from '../hooks/useWorkspace'
import { languageFor } from '../workspace'
import FileTree from './FileTree'
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

export default function Ide() {
  const workspace = useWorkspace()
  const { state, setActive, closeTab, updateContent } = workspace
  const active = state.activeFile

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
      </div>
    </div>
  )
}
