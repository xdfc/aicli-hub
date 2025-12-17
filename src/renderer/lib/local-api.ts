/**
 * Local API implementation for when Electron is not available
 * Uses localStorage to persist data
 */

import type { CLIInfo, HistoryRecord } from '../store/app-store'

const STORAGE_KEYS = {
  HISTORY: 'aicli-hub-history',
  CLI_CONFIGS: 'aicli-hub-cli-configs',
}

// Default CLI list for local mode
const DEFAULT_CLIS: CLIInfo[] = [
  {
    name: 'claude',
    displayName: 'Claude Code',
    command: 'claude',
    version: null,
    available: true,
    description: 'Anthropic Claude CLI',
    config: {},
  },
  {
    name: 'qwen',
    displayName: 'Qwen CLI',
    command: 'qwen',
    version: null,
    available: true,
    description: 'Alibaba Qwen CLI',
    config: {},
  },
  {
    name: 'ollama',
    displayName: 'Ollama',
    command: 'ollama',
    version: null,
    available: true,
    description: 'Local LLM with Ollama',
    config: { model: 'llama2' },
  },
]

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
export const localAPI = {
  // Task execution - mock implementation
  executeTask: async (_cliName: string, prompt: string): Promise<string> => {
    // In local mode, we just simulate a response
    const mockOutput = `[Local Mode] Received prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\nThis is running in local mode without Electron backend.\nTo use actual CLI tools, please run the full Electron application with:\n  npm run dev`

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
}

// Check if running in Electron environment
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

// Get the appropriate API (Electron or Local)
export function getAPI() {
  if (isElectronEnvironment()) {
    return window.electronAPI
  }
  return localAPI
}
