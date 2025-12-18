import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

export interface SessionMessage {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: number
}

export interface SessionInfo {
  id: string
  cliName: string
  workingDirectory: string
  createdAt: number
  messages: SessionMessage[]
}

export interface ElectronAPI {
  // Task execution
  executeTask: (cliName: string, prompt: string, workingDirectory?: string | null) => Promise<string>
  cancelTask: () => Promise<void>
  onTaskOutput: (callback: (output: string) => void) => () => void
  onTaskComplete: (callback: (result: { success: boolean; error?: string }) => void) => () => void

  // Session management
  sessionCreate: (cliName: string, workingDirectory: string) => Promise<string>
  sessionSendInput: (sessionId: string, input: string) => Promise<boolean>
  sessionExecuteCli: (sessionId: string, cliName: string, prompt: string) => Promise<boolean>
  sessionStartCli: (sessionId: string, cliName: string) => Promise<boolean>
  sessionClose: (sessionId: string) => Promise<boolean>
  sessionGet: (sessionId: string) => Promise<SessionInfo | null>
  sessionGetActive: () => Promise<string | null>
  sessionSetActive: (sessionId: string | null) => Promise<boolean>
  sessionGetAll: () => Promise<SessionInfo[]>
  sessionResize: (sessionId: string, cols: number, rows: number) => Promise<boolean>
  sessionInterrupt: (sessionId: string) => Promise<boolean>
  onSessionOutput: (callback: (data: { sessionId: string; data: string }) => void) => () => void
  onSessionCreated: (callback: (data: { sessionId: string; cliName: string; workingDirectory: string }) => void) => () => void
  onSessionClosed: (callback: (data: { sessionId: string }) => void) => () => void
  onSessionUserInput: (callback: (data: { sessionId: string; message: SessionMessage }) => void) => () => void
  onSessionExit: (callback: (data: { sessionId: string; exitCode: number }) => void) => () => void

  // History management
  getHistory: (limit?: number, offset?: number) => Promise<HistoryRecord[]>
  searchHistory: (query: string, cliName?: string) => Promise<HistoryRecord[]>
  deleteHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  getHistoryStats: () => Promise<HistoryStats>

  // CLI management
  getCLIList: () => Promise<CLIInfo[]>
  updateCLIConfig: (cliName: string, config: Record<string, unknown>) => Promise<void>

  // Folder selection
  selectFolder: () => Promise<string | null>
}

export interface HistoryRecord {
  id: string
  cliName: string
  prompt: string
  output: string | null
  error: string | null
  executionTime: number | null
  timestamp: number
  tags: string | null
  workingDirectory?: string | null
}

export interface HistoryStats {
  totalRecords: number
  totalByCliName: Record<string, number>
}

export interface CLIInfo {
  name: string
  displayName: string
  command: string
  version: string | null
  available: boolean
  description: string
  config?: Record<string, unknown>
}

const electronAPI: ElectronAPI = {
  // Task execution
  executeTask: (cliName: string, prompt: string, workingDirectory?: string | null) =>
    ipcRenderer.invoke('execute-task', cliName, prompt, workingDirectory),

  cancelTask: () => ipcRenderer.invoke('cancel-task'),

  onTaskOutput: (callback: (output: string) => void) => {
    const handler = (_event: IpcRendererEvent, output: string) => callback(output)
    ipcRenderer.on('task-output', handler)
    return () => ipcRenderer.removeListener('task-output', handler)
  },

  onTaskComplete: (callback: (result: { success: boolean; error?: string }) => void) => {
    const handler = (_event: IpcRendererEvent, result: { success: boolean; error?: string }) =>
      callback(result)
    ipcRenderer.on('task-complete', handler)
    return () => ipcRenderer.removeListener('task-complete', handler)
  },

  // Session management
  sessionCreate: (cliName: string, workingDirectory: string) =>
    ipcRenderer.invoke('session-create', cliName, workingDirectory),

  sessionSendInput: (sessionId: string, input: string) =>
    ipcRenderer.invoke('session-send-input', sessionId, input),

  sessionExecuteCli: (sessionId: string, cliName: string, prompt: string) =>
    ipcRenderer.invoke('session-execute-cli', sessionId, cliName, prompt),

  sessionStartCli: (sessionId: string, cliName: string) =>
    ipcRenderer.invoke('session-start-cli', sessionId, cliName),

  sessionClose: (sessionId: string) =>
    ipcRenderer.invoke('session-close', sessionId),

  sessionGet: (sessionId: string) =>
    ipcRenderer.invoke('session-get', sessionId),

  sessionGetActive: () =>
    ipcRenderer.invoke('session-get-active'),

  sessionSetActive: (sessionId: string | null) =>
    ipcRenderer.invoke('session-set-active', sessionId),

  sessionGetAll: () =>
    ipcRenderer.invoke('session-get-all'),

  sessionResize: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('session-resize', sessionId, cols, rows),

  sessionInterrupt: (sessionId: string) =>
    ipcRenderer.invoke('session-interrupt', sessionId),

  onSessionOutput: (callback: (data: { sessionId: string; data: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sessionId: string; data: string }) => callback(data)
    ipcRenderer.on('session-output', handler)
    return () => ipcRenderer.removeListener('session-output', handler)
  },

  onSessionCreated: (callback: (data: { sessionId: string; cliName: string; workingDirectory: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sessionId: string; cliName: string; workingDirectory: string }) => callback(data)
    ipcRenderer.on('session-created', handler)
    return () => ipcRenderer.removeListener('session-created', handler)
  },

  onSessionClosed: (callback: (data: { sessionId: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sessionId: string }) => callback(data)
    ipcRenderer.on('session-closed', handler)
    return () => ipcRenderer.removeListener('session-closed', handler)
  },

  onSessionUserInput: (callback: (data: { sessionId: string; message: SessionMessage }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sessionId: string; message: SessionMessage }) => callback(data)
    ipcRenderer.on('session-user-input', handler)
    return () => ipcRenderer.removeListener('session-user-input', handler)
  },

  onSessionExit: (callback: (data: { sessionId: string; exitCode: number }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { sessionId: string; exitCode: number }) => callback(data)
    ipcRenderer.on('session-exit', handler)
    return () => ipcRenderer.removeListener('session-exit', handler)
  },

  // History management
  getHistory: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('get-history', limit, offset),

  searchHistory: (query: string, cliName?: string) =>
    ipcRenderer.invoke('search-history', query, cliName),

  deleteHistory: (id: string) => ipcRenderer.invoke('delete-history', id),

  clearHistory: () => ipcRenderer.invoke('clear-history'),

  getHistoryStats: () => ipcRenderer.invoke('get-history-stats'),

  // CLI management
  getCLIList: () => ipcRenderer.invoke('get-cli-list'),

  updateCLIConfig: (cliName: string, config: Record<string, unknown>) =>
    ipcRenderer.invoke('update-cli-config', cliName, config),

  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
