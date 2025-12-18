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

export interface SessionMessage {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: number
}

export interface Session {
  id: string
  cliName: string
  workingDirectory: string
  createdAt: number
  output: string
  isActive: boolean
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

  // Session state
  currentSessionId: string | null
  sessions: Session[]
  sessionOutput: string
  isSessionReady: boolean

  // Task state
  task: TaskState

  // History state
  history: HistoryRecord[]
  selectedHistoryId: string | null

  // Search state
  searchQuery: string
  searchResults: HistoryRecord[]
  searchCLIFilter: string | null

  // View state
  viewMode: 'chat' | 'settings' | 'stats'

  // Actions
  loadCLIs: () => Promise<void>
  selectCLI: (name: string) => void
  updateCLIConfig: (name: string, config: Record<string, unknown>) => Promise<void>

  // Working directory actions
  setWorkingDirectory: (path: string | null) => void
  selectWorkingDirectory: () => Promise<void>

  // Session actions
  createSession: () => Promise<string | null>
  closeSession: (sessionId: string) => Promise<void>
  closeCurrentSession: () => Promise<void>
  sendSessionInput: (input: string) => Promise<boolean>
  appendSessionOutput: (output: string) => void
  clearSessionOutput: () => void
  setSessionReady: (ready: boolean) => void
  interruptSession: () => Promise<void>

  // Task actions
  executeTask: (prompt: string) => Promise<void>
  cancelTask: () => Promise<void>
  appendOutput: (text: string) => void
  setTaskOutput: (output: string, error: string | null) => void
  completeTask: (success: boolean, error?: string) => void
  clearOutput: () => void

  // History actions
  loadHistory: () => Promise<void>
  selectHistory: (id: string | null) => void
  deleteHistory: (id: string) => Promise<void>
  clearAllHistory: () => Promise<void>

  // Search actions
  setSearchQuery: (query: string) => void
  setSearchCLIFilter: (cliName: string | null) => void
  performSearch: () => Promise<void>

  // View actions
  setViewMode: (mode: 'chat' | 'settings' | 'stats') => void

  // New conversation action
  newConversation: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  clis: [],
  selectedCLI: null,
  workingDirectory: null,

  // Session state
  currentSessionId: null,
  sessions: [],
  sessionOutput: '',
  isSessionReady: false,

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
  viewMode: 'chat',

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

  // Session actions
  createSession: async () => {
    const { selectedCLI, workingDirectory } = get()
    if (!selectedCLI || !workingDirectory) {
      console.error('需要选择CLI和工作目录才能创建会话')
      return null
    }

    try {
      const api = getAPI()

      // 设置会话输出监听器
      if (isElectronEnvironment()) {
        api.onSessionOutput((data) => {
          if (data.sessionId === get().currentSessionId) {
            get().appendSessionOutput(data.data)
          }
        })
      }

      const sessionId = await api.sessionCreate(selectedCLI, workingDirectory)

      const newSession: Session = {
        id: sessionId,
        cliName: selectedCLI,
        workingDirectory,
        createdAt: Date.now(),
        output: '',
        isActive: true,
      }

      set((state) => ({
        currentSessionId: sessionId,
        sessions: [...state.sessions, newSession],
        sessionOutput: '',
        isSessionReady: true,
        selectedHistoryId: null,
        task: {
          isRunning: false,
          output: '',
          error: null,
          startTime: null,
        },
      }))

      return sessionId
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  },

  closeSession: async (sessionId: string) => {
    try {
      const api = getAPI()
      await api.sessionClose(sessionId)

      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        sessionOutput: state.currentSessionId === sessionId ? '' : state.sessionOutput,
        isSessionReady: state.currentSessionId === sessionId ? false : state.isSessionReady,
      }))

      // 刷新历史记录
      await get().loadHistory()
    } catch (error) {
      console.error('Failed to close session:', error)
    }
  },

  closeCurrentSession: async () => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    try {
      const api = getAPI()
      await api.sessionClose(currentSessionId)

      set({
        currentSessionId: null,
        sessionOutput: '',
        isSessionReady: false,
        selectedHistoryId: null,
        task: {
          isRunning: false,
          output: '',
          error: null,
          startTime: null,
        },
      })

      // 刷新历史记录
      await get().loadHistory()
    } catch (error) {
      console.error('Failed to close current session:', error)
    }
  },

  sendSessionInput: async (input: string) => {
    const { currentSessionId } = get()
    if (!currentSessionId) {
      console.error('No active session')
      return false
    }

    try {
      const api = getAPI()

      // 显示用户输入
      get().appendSessionOutput(`\n$ ${input}\n`)

      // 设置运行状态
      set((state) => ({
        task: {
          ...state.task,
          isRunning: true,
          startTime: Date.now(),
        },
      }))

      // 发送输入到会话
      const success = await api.sessionSendInput(currentSessionId, input)

      return success
    } catch (error) {
      console.error('Failed to send session input:', error)
      set((state) => ({
        task: {
          ...state.task,
          isRunning: false,
          error: String(error),
        },
      }))
      return false
    }
  },

  appendSessionOutput: (output: string) => {
    set((state) => ({
      sessionOutput: state.sessionOutput + output,
      task: {
        ...state.task,
        output: state.task.output + output,
      },
    }))
  },

  clearSessionOutput: () => {
    set({
      sessionOutput: '',
      task: {
        isRunning: false,
        output: '',
        error: null,
        startTime: null,
      },
    })
  },

  setSessionReady: (ready: boolean) => {
    set({ isSessionReady: ready })
  },

  interruptSession: async () => {
    const { currentSessionId } = get()
    if (!currentSessionId) return

    try {
      const api = getAPI()
      await api.sessionInterrupt(currentSessionId)
      set((state) => ({
        task: {
          ...state.task,
          isRunning: false,
        },
      }))
    } catch (error) {
      console.error('Failed to interrupt session:', error)
    }
  },

  // Task actions
  executeTask: async (prompt: string) => {
    const { selectedCLI, workingDirectory, currentSessionId } = get()
    if (!selectedCLI) {
      console.error('No CLI selected')
      return
    }

    // 如果有活跃会话，使用会话模式
    if (currentSessionId) {
      await get().sendSessionInput(prompt)
      return
    }

    // 否则使用传统模式
    set({
      task: {
        isRunning: true,
        output: '',
        error: null,
        startTime: Date.now(),
      },
    })

    const api = getAPI()

    const removeOutputListener = api.onTaskOutput((output: string) => {
      get().appendOutput(output)
    })

    const removeCompleteListener = api.onTaskComplete(
      (result: { success: boolean; error?: string }) => {
        get().completeTask(result.success, result.error)
        get().loadHistory()
      }
    )

    try {
      const output = await api.executeTask(selectedCLI, prompt, workingDirectory)
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
    const { currentSessionId } = get()

    // 如果有活跃会话，中断会话
    if (currentSessionId) {
      await get().interruptSession()
      return
    }

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

  // View actions
  setViewMode: (mode: 'chat' | 'settings' | 'stats') => {
    set({ viewMode: mode })
  },

  // New conversation action - 重置状态并回到对话页
  newConversation: () => {
    // 关闭当前会话
    const { currentSessionId } = get()
    if (currentSessionId) {
      const api = getAPI()
      api.sessionClose(currentSessionId).catch(console.error)
    }

    set({
      currentSessionId: null,
      sessionOutput: '',
      isSessionReady: false,
      selectedHistoryId: null,
      viewMode: 'chat',
      task: {
        isRunning: false,
        output: '',
        error: null,
        startTime: null,
      },
    })
  },
}))
