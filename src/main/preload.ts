import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

export interface ElectronAPI {
  // Task execution
  executeTask: (cliName: string, prompt: string) => Promise<string>
  cancelTask: () => Promise<void>
  onTaskOutput: (callback: (output: string) => void) => () => void
  onTaskComplete: (callback: (result: { success: boolean; error?: string }) => void) => () => void

  // History management
  getHistory: (limit?: number, offset?: number) => Promise<HistoryRecord[]>
  searchHistory: (query: string, cliName?: string) => Promise<HistoryRecord[]>
  deleteHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  getHistoryStats: () => Promise<HistoryStats>

  // CLI management
  getCLIList: () => Promise<CLIInfo[]>
  updateCLIConfig: (cliName: string, config: Record<string, unknown>) => Promise<void>
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
  executeTask: (cliName: string, prompt: string) =>
    ipcRenderer.invoke('execute-task', cliName, prompt),

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
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
