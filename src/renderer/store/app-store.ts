import { create } from 'zustand'
import { getAPI, isElectronEnvironment } from '../lib/local-api'

export interface CLIInfo {
  name: string
  displayName: string
  command: string
  version: string | null
  available: boolean
  description: string
  config?: Record<string, unknown>
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

interface TaskState {
  isRunning: boolean
  output: string
  error: string | null
  startTime: number | null
}

interface AppState {
  // CLI state
  clis: CLIInfo[]
  selectedCLI: string | null

  // Working directory state
  workingDirectory: string | null

  // Task state
  task: TaskState

  // History state
  history: HistoryRecord[]
  selectedHistoryId: string | null

  // Search state
  searchQuery: string
  searchResults: HistoryRecord[]
  searchCLIFilter: string | null

  // Actions
  loadCLIs: () => Promise<void>
  selectCLI: (name: string) => void
  updateCLIConfig: (name: string, config: Record<string, unknown>) => Promise<void>

  // Working directory actions
  setWorkingDirectory: (path: string | null) => void
  selectWorkingDirectory: () => Promise<void>

  executeTask: (prompt: string) => Promise<void>
  cancelTask: () => Promise<void>
  appendOutput: (text: string) => void
  setTaskOutput: (output: string, error: string | null) => void
  completeTask: (success: boolean, error?: string) => void
  clearOutput: () => void

  loadHistory: () => Promise<void>
  selectHistory: (id: string | null) => void
  deleteHistory: (id: string) => Promise<void>
  clearAllHistory: () => Promise<void>

  setSearchQuery: (query: string) => void
  setSearchCLIFilter: (cliName: string | null) => void
  performSearch: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  clis: [],
  selectedCLI: null,
  workingDirectory: null,
  task: {
    isRunning: false,
    output: '',
    error: null,
    startTime: null,
  },
  history: [],
  selectedHistoryId: null,
  searchQuery: '',
  searchResults: [],
  searchCLIFilter: null,

  // CLI actions
  loadCLIs: async () => {
    try {
      const api = getAPI()
      const clis = await api.getCLIList()
      const availableCLIs = clis.filter((cli: CLIInfo) => cli.available)
      set({
        clis,
        selectedCLI: availableCLIs.length > 0 ? availableCLIs[0].name : null,
      })
    } catch (error) {
      console.error('Failed to load CLIs:', error)
    }
  },

  selectCLI: (name: string) => {
    set({ selectedCLI: name })
  },

  updateCLIConfig: async (name: string, config: Record<string, unknown>) => {
    try {
      const api = getAPI()
      await api.updateCLIConfig(name, config)
      const { clis } = get()
      set({
        clis: clis.map((cli) =>
          cli.name === name ? { ...cli, config: { ...cli.config, ...config } } : cli
        ),
      })
    } catch (error) {
      console.error('Failed to update CLI config:', error)
    }
  },

  // Working directory actions
  setWorkingDirectory: (path: string | null) => {
    set({ workingDirectory: path })
  },

  selectWorkingDirectory: async () => {
    try {
      const api = getAPI()
      // 更加健壮的调用方式
      if (typeof api.selectFolder === 'function') {
        const path = await api.selectFolder()
        if (path) {
          set({ workingDirectory: path })
        }
      } else {
        console.warn('selectFolder 方法不可用')
      }
    } catch (error) {
      console.error('Failed to select working directory:', error)
    }
  },

  // Task actions
  executeTask: async (prompt: string) => {
    const { selectedCLI, workingDirectory } = get()
    if (!selectedCLI) {
      console.error('No CLI selected')
      return
    }

    set({
      task: {
        isRunning: true,
        output: '',
        error: null,
        startTime: Date.now(),
      },
    })

    const api = getAPI()

    // Set up listeners for streaming output (only works in Electron mode)
    const removeOutputListener = api.onTaskOutput((output: string) => {
      get().appendOutput(output)
    })

    const removeCompleteListener = api.onTaskComplete(
      (result: { success: boolean; error?: string }) => {
        get().completeTask(result.success, result.error)
        // Refresh history after task completes
        get().loadHistory()
      }
    )

    try {
      // Pass working directory if available
      const output = await (api as { executeTask: (cli: string, prompt: string, workingDirectory?: string | null) => Promise<string> }).executeTask(selectedCLI, prompt, workingDirectory)
      // In local mode, we get the output directly
      if (!isElectronEnvironment()) {
        get().appendOutput(output)
        get().completeTask(true)
        get().loadHistory()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      get().completeTask(false, errorMessage)
    } finally {
      removeOutputListener()
      removeCompleteListener()
    }
  },

  cancelTask: async () => {
    try {
      const api = getAPI()
      await api.cancelTask()
      set((state) => ({
        task: {
          ...state.task,
          isRunning: false,
          error: '用户取消了任务',
        },
      }))
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  },

  appendOutput: (text: string) => {
    set((state) => ({
      task: {
        ...state.task,
        output: state.task.output + text,
      },
    }))
  },

  setTaskOutput: (output: string, error: string | null) => {
    set((state) => ({
      task: {
        ...state.task,
        output,
        error,
        isRunning: false,
      },
    }))
  },

  completeTask: (success: boolean, error?: string) => {
    set((state) => ({
      task: {
        ...state.task,
        isRunning: false,
        error: success ? null : error || '未知错误',
      },
    }))
  },

  clearOutput: () => {
    set((state) => ({
      task: {
        ...state.task,
        output: '',
        error: null,
      },
    }))
  },

  // History actions
  loadHistory: async () => {
    try {
      const api = getAPI()
      const history = await api.getHistory(100, 0)
      set({ history })
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  },

  selectHistory: (id: string | null) => {
    set({ selectedHistoryId: id })
  },

  deleteHistory: async (id: string) => {
    try {
      const api = getAPI()
      await api.deleteHistory(id)
      const { history, selectedHistoryId } = get()
      set({
        history: history.filter((record) => record.id !== id),
        selectedHistoryId: selectedHistoryId === id ? null : selectedHistoryId,
      })
    } catch (error) {
      console.error('Failed to delete history:', error)
    }
  },

  clearAllHistory: async () => {
    try {
      const api = getAPI()
      await api.clearHistory()
      set({ history: [], selectedHistoryId: null })
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  },

  // Search actions
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setSearchCLIFilter: (cliName: string | null) => {
    set({ searchCLIFilter: cliName })
  },

  performSearch: async () => {
    const { searchQuery, searchCLIFilter } = get()
    if (!searchQuery.trim()) {
      set({ searchResults: [] })
      return
    }

    try {
      const api = getAPI()
      const results = await api.searchHistory(
        searchQuery,
        searchCLIFilter || undefined
      )
      set({ searchResults: results })
    } catch (error) {
      console.error('Failed to search history:', error)
      set({ searchResults: [] })
    }
  },
}))
