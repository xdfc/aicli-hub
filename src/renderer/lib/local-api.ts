/**
 * Local API implementation for when Electron is not available
 * Uses localStorage to persist data
 */

import type { CLIInfo, HistoryRecord } from '../store/app-store'
import type { ElectronAPI, SessionInfo, SessionMessage } from '../global.d'

const STORAGE_KEYS = {
  HISTORY: 'aicli-hub-history',
  CLI_CONFIGS: 'aicli-hub-cli-configs',
  SESSIONS: 'aicli-hub-sessions',
}

// Default CLI list for local mode
const DEFAULT_CLIS: CLIInfo[] = [
  {
    name: 'claude',
    displayName: 'Claude Code',
    command: 'claude',
    version: null,
    available: true,
    description: 'Anthropic Claude 命令行工具',
    config: {},
  },
  {
    name: 'qwen',
    displayName: 'Qwen CLI',
    command: 'qwen',
    version: null,
    available: true,
    description: '阿里巴巴通义千问命令行工具',
    config: {},
  },
  {
    name: 'ollama',
    displayName: 'Ollama',
    command: 'ollama',
    version: null,
    available: true,
    description: '本地运行大语言模型',
    config: { model: 'llama2' },
  },
]

// Local session storage
let localSessions: Map<string, SessionInfo> = new Map()
let activeSessionId: string | null = null

// Helper functions for localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Local API implementation
export const localAPI: ElectronAPI = {
  // Task execution - mock implementation
  executeTask: async (_cliName: string, prompt: string, _workingDirectory?: string | null): Promise<string> => {
    // In local mode, we just simulate a response
    const mockOutput = `[本地模式] 收到提示: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"

当前正在本地模式下运行，没有 Electron 后端支持。
要使用实际的 CLI 工具，请运行完整的 Electron 应用:
  npm run dev`

    // Save to history
    const record: HistoryRecord = {
      id: generateId(),
      cliName: _cliName,
      prompt,
      output: mockOutput,
      error: null,
      executionTime: 100,
      timestamp: Date.now(),
      tags: null,
    }

    const history = getFromStorage<HistoryRecord[]>(STORAGE_KEYS.HISTORY, [])
    history.unshift(record)
    setToStorage(STORAGE_KEYS.HISTORY, history)

    return mockOutput
  },

  cancelTask: async (): Promise<void> => {
    // No-op in local mode
  },

  onTaskOutput: (_callback: (output: string) => void): (() => void) => {
    // No streaming in local mode
    return () => {}
  },

  onTaskComplete: (_callback: (result: { success: boolean; error?: string }) => void): (() => void) => {
    // No events in local mode
    return () => {}
  },

  // Session management - mock implementation
  sessionCreate: async (cliName: string, workingDirectory: string): Promise<string> => {
    const sessionId = generateId()
    const session: SessionInfo = {
      id: sessionId,
      cliName,
      workingDirectory,
      createdAt: Date.now(),
      messages: [],
      output: '',
    }
    localSessions.set(sessionId, session)
    activeSessionId = sessionId
    return sessionId
  },

  sessionSendInput: async (sessionId: string, input: string): Promise<boolean> => {
    const session = localSessions.get(sessionId)
    if (!session) return false

    const message: SessionMessage = {
      id: generateId(),
      type: 'user',
      content: input,
      timestamp: Date.now(),
    }
    session.messages.push(message)

    // Mock response
    setTimeout(() => {
      const responseMessage: SessionMessage = {
        id: generateId(),
        type: 'system',
        content: `[本地模式] 收到命令: ${input}\n\n这是模拟响应。实际功能需要在 Electron 环境中运行。`,
        timestamp: Date.now(),
      }
      session.messages.push(responseMessage)
    }, 500)

    return true
  },

  sessionExecuteCli: async (sessionId: string, _cliName: string, prompt: string): Promise<boolean> => {
    return localAPI.sessionSendInput(sessionId, prompt)
  },

  sessionStartCli: async (_sessionId: string, _cliName: string): Promise<boolean> => {
    return true
  },

  sessionClose: async (sessionId: string): Promise<boolean> => {
    if (!localSessions.has(sessionId)) return false
    localSessions.delete(sessionId)
    if (activeSessionId === sessionId) {
      activeSessionId = null
    }
    return true
  },

  sessionGet: async (sessionId: string): Promise<SessionInfo | null> => {
    return localSessions.get(sessionId) || null
  },

  sessionGetActive: async (): Promise<string | null> => {
    return activeSessionId
  },

  sessionSetActive: async (sessionId: string | null): Promise<boolean> => {
    if (sessionId === null) {
      activeSessionId = null
      return true
    }
    if (!localSessions.has(sessionId)) return false
    activeSessionId = sessionId
    return true
  },

  sessionGetAll: async (): Promise<SessionInfo[]> => {
    return Array.from(localSessions.values())
  },

  sessionResize: async (_sessionId: string, _cols: number, _rows: number): Promise<boolean> => {
    return true
  },

  sessionInterrupt: async (_sessionId: string): Promise<boolean> => {
    return true
  },

  onSessionOutput: (_callback: (data: { sessionId: string; data: string }) => void): (() => void) => {
    return () => {}
  },

  onSessionCreated: (_callback: (data: { sessionId: string; cliName: string; workingDirectory: string }) => void): (() => void) => {
    return () => {}
  },

  onSessionClosed: (_callback: (data: { sessionId: string }) => void): (() => void) => {
    return () => {}
  },

  onSessionUserInput: (_callback: (data: { sessionId: string; message: SessionMessage }) => void): (() => void) => {
    return () => {}
  },

  onSessionExit: (_callback: (data: { sessionId: string; exitCode: number }) => void): (() => void) => {
    return () => {}
  },

  // History management
  getHistory: async (limit = 100, offset = 0): Promise<HistoryRecord[]> => {
    const history = getFromStorage<HistoryRecord[]>(STORAGE_KEYS.HISTORY, [])
    return history.slice(offset, offset + limit)
  },

  searchHistory: async (query: string, cliName?: string): Promise<HistoryRecord[]> => {
    const history = getFromStorage<HistoryRecord[]>(STORAGE_KEYS.HISTORY, [])
    const lowerQuery = query.toLowerCase()

    return history.filter((record) => {
      const matchesCLI = !cliName || record.cliName === cliName
      const matchesQuery =
        record.prompt.toLowerCase().includes(lowerQuery) ||
        (record.output?.toLowerCase().includes(lowerQuery) ?? false)
      return matchesCLI && matchesQuery
    })
  },

  deleteHistory: async (id: string): Promise<void> => {
    const history = getFromStorage<HistoryRecord[]>(STORAGE_KEYS.HISTORY, [])
    const filtered = history.filter((record) => record.id !== id)
    setToStorage(STORAGE_KEYS.HISTORY, filtered)
  },

  clearHistory: async (): Promise<void> => {
    setToStorage(STORAGE_KEYS.HISTORY, [])
  },

  getHistoryStats: async (): Promise<{ totalRecords: number; totalByCliName: Record<string, number> }> => {
    const history = getFromStorage<HistoryRecord[]>(STORAGE_KEYS.HISTORY, [])
    const totalByCliName: Record<string, number> = {}

    for (const record of history) {
      totalByCliName[record.cliName] = (totalByCliName[record.cliName] || 0) + 1
    }

    return {
      totalRecords: history.length,
      totalByCliName,
    }
  },

  // CLI management
  getCLIList: async (): Promise<CLIInfo[]> => {
    const configs = getFromStorage<Record<string, Record<string, unknown>>>(STORAGE_KEYS.CLI_CONFIGS, {})

    return DEFAULT_CLIS.map((cli) => ({
      ...cli,
      config: { ...cli.config, ...configs[cli.name] },
    }))
  },

  updateCLIConfig: async (cliName: string, config: Record<string, unknown>): Promise<void> => {
    const configs = getFromStorage<Record<string, Record<string, unknown>>>(STORAGE_KEYS.CLI_CONFIGS, {})
    configs[cliName] = { ...configs[cliName], ...config }
    setToStorage(STORAGE_KEYS.CLI_CONFIGS, configs)
  },

  // Folder selection - not available in local mode
  selectFolder: async (): Promise<string | null> => {
    console.warn('Folder selection is not available in local mode')
    return null
  },
}

// Check if running in Electron environment
export function isElectronEnvironment(): boolean {
  // 更准确的 Electron 环境检测
  return typeof window !== 'undefined' &&
         window.electronAPI !== undefined &&
         typeof window.electronAPI === 'object' &&
         'selectFolder' in window.electronAPI
}

// Get the appropriate API (Electron or Local)
export function getAPI() {
  if (isElectronEnvironment()) {
    return window.electronAPI
  }
  return localAPI
}
