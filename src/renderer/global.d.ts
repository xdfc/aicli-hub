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