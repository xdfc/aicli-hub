import { create } from 'zustand'

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

  executeTask: (prompt: string) => Promise<void>
  cancelTask: () => Promise<void>
  appendOutput: (text: string) => void
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
      const clis = await window.electronAPI.getCLIList()
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
      await window.electronAPI.updateCLIConfig(name, config)
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

  // Task actions
  executeTask: async (prompt: string) => {
    const { selectedCLI } = get()
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

    // Set up listeners for streaming output
    const removeOutputListener = window.electronAPI.onTaskOutput((output: string) => {
      get().appendOutput(output)
    })

    const removeCompleteListener = window.electronAPI.onTaskComplete(
      (result: { success: boolean; error?: string }) => {
        get().completeTask(result.success, result.error)
        // Refresh history after task completes
        get().loadHistory()
      }
    )

    try {
      await window.electronAPI.executeTask(selectedCLI, prompt)
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
      await window.electronAPI.cancelTask()
      set((state) => ({
        task: {
          ...state.task,
          isRunning: false,
          error: 'Task cancelled by user',
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

  completeTask: (success: boolean, error?: string) => {
    set((state) => ({
      task: {
        ...state.task,
        isRunning: false,
        error: success ? null : error || 'Unknown error',
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
      const history = await window.electronAPI.getHistory(100, 0)
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
      await window.electronAPI.deleteHistory(id)
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
      await window.electronAPI.clearHistory()
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
      const results = await window.electronAPI.searchHistory(
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
