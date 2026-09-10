import { useState } from 'react'
import type { WorkspaceApi } from '../hooks/useWorkspace'
import './FileTree.css'

const FILE_ICONS: Record<string, { glyph: string; color: string }> = {
  py: { glyph: '◆', color: '#54fcfc' },
  js: { glyph: '■', color: '#fcfc54' },
  ts: { glyph: '■', color: '#5498fc' },
  html: { glyph: '▣', color: '#fc8154' },
  css: { glyph: '▤', color: '#b054fc' },
  md: { glyph: '▥', color: '#a0a0a0' },
  json: { glyph: '◇', color: '#7cbd4f' },
}

function iconFor(name: string) {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return FILE_ICONS[ext] ?? { glyph: '□', color: '#8b8b8b' }
}

interface FileTreeProps {
  workspace: WorkspaceApi
}

export default function FileTree({ workspace }: FileTreeProps) {
  const { state, openFile, createFile, renameFile, deleteFile } = workspace
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const names = Object.keys(state.files).sort()

  function commitCreate() {
    if (draft.trim()) createFile(draft)
    setCreating(false)
    setDraft('')
  }

  function commitRename(oldName: string) {
    if (draft.trim()) renameFile(oldName, draft)
    setRenaming(null)
    setDraft('')
  }

  return (
    <div className="filetree">
      <div className="filetree-header">
        <span className="filetree-title">CHEST (FILES)</span>
        <button
          className="filetree-add"
          title="New file"
          onClick={() => {
            setCreating(true)
            setRenaming(null)
            setDraft('')
          }}
        >
          +
        </button>
      </div>

      <ul className="filetree-list">
        {names.map((name) => {
          const icon = iconFor(name)
          const active = state.activeFile === name
          return (
            <li key={name} className={`filetree-item ${active ? 'active' : ''}`}>
              {renaming === name ? (
                <input
                  className="filetree-input"
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(name)
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <>
                  <button className="filetree-name" onClick={() => openFile(name)}>
                    <span className="filetree-icon" style={{ color: icon.color }}>
                      {icon.glyph}
                    </span>
                    {name}
                  </button>
                  <span className="filetree-actions">
                    <button
                      title="Rename"
                      onClick={() => {
                        setRenaming(name)
                        setCreating(false)
                        setDraft(name)
                      }}
                    >
                      ✎
                    </button>
                    <button
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete ${name}? (It drops no loot.)`)) {
                          deleteFile(name)
                        }
                      }}
                    >
                      ✕
                    </button>
                  </span>
                </>
              )}
            </li>
          )
        })}

        {creating && (
          <li className="filetree-item">
            <input
              className="filetree-input"
              placeholder="filename.py"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') setCreating(false)
              }}
            />
          </li>
        )}
      </ul>

      <button
        className="filetree-reset"
        title="Restore starter files"
        onClick={() => {
          if (confirm('Reset workspace to starter files? This clears your changes.')) {
            workspace.resetWorkspace()
          }
        }}
      >
        ↺ reset workspace
      </button>
    </div>
  )
}
