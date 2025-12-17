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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}