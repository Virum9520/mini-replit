import { useCallback, useEffect, useState } from 'react'
import {
  loadWorkspace,
  saveWorkspace,
  starterWorkspace,
  type WorkspaceState,
} from '../workspace'

export interface WorkspaceApi {
  state: WorkspaceState
  openFile: (name: string) => void
  closeTab: (name: string) => void
  setActive: (name: string) => void
  updateContent: (name: string, content: string) => void
  createFile: (name: string) => boolean
  renameFile: (oldName: string, newName: string) => boolean
  deleteFile: (name: string) => void
  resetWorkspace: () => void
}

export function useWorkspace(): WorkspaceApi {
  const [state, setState] = useState<WorkspaceState>(loadWorkspace)

  useEffect(() => {
    saveWorkspace(state)
  }, [state])

  const openFile = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      openTabs: s.openTabs.includes(name) ? s.openTabs : [...s.openTabs, name],
      activeFile: name,
    }))
  }, [])

  const closeTab = useCallback((name: string) => {
    setState((s) => {
      const openTabs = s.openTabs.filter((t) => t !== name)
      const activeFile =
        s.activeFile === name
          ? openTabs[openTabs.length - 1] ?? null
          : s.activeFile
      return { ...s, openTabs, activeFile }
    })
  }, [])

  const setActive = useCallback((name: string) => {
    setState((s) => ({ ...s, activeFile: name }))
  }, [])

  const updateContent = useCallback((name: string, content: string) => {
    setState((s) => ({ ...s, files: { ...s.files, [name]: content } }))
  }, [])

  const createFile = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim()
      if (!trimmed || state.files[trimmed] !== undefined) return false
      setState((s) => ({
        ...s,
        files: { ...s.files, [trimmed]: '' },
        openTabs: [...s.openTabs, trimmed],
        activeFile: trimmed,
      }))
      return true
    },
    [state.files],
  )

  const renameFile = useCallback(
    (oldName: string, newName: string): boolean => {
      const trimmed = newName.trim()
      if (!trimmed || trimmed === oldName) return false
      if (state.files[trimmed] !== undefined) return false
      setState((s) => {
        const files = { ...s.files }
        files[trimmed] = files[oldName]
        delete files[oldName]
        return {
          files,
          openTabs: s.openTabs.map((t) => (t === oldName ? trimmed : t)),
          activeFile: s.activeFile === oldName ? trimmed : s.activeFile,
        }
      })
      return true
    },
    [state.files],
  )

  const deleteFile = useCallback((name: string) => {
    setState((s) => {
      const files = { ...s.files }
      delete files[name]
      const openTabs = s.openTabs.filter((t) => t !== name)
      const activeFile =
        s.activeFile === name
          ? openTabs[openTabs.length - 1] ?? null
          : s.activeFile
      return { files, openTabs, activeFile }
    })
  }, [])

  const resetWorkspace = useCallback(() => {
    setState(starterWorkspace())
  }, [])

  return {
    state,
    openFile,
    closeTab,
    setActive,
    updateContent,
    createFile,
    renameFile,
    deleteFile,
    resetWorkspace,
  }
}
