import { useCallback } from 'react'

export interface ElectronAPI {
  executeTask: (cliName: string, prompt: string) => Promise<string>
  cancelTask: () => Promise<void>
  onTaskOutput: (callback: (output: string) => void) => () => void
  onTaskComplete: (callback: (result: { success: boolean; error?: string }) => void) => () => void
  getHistory: (limit?: number, offset?: number) => Promise<HistoryRecord[]>
  searchHistory: (query: string, cliName?: string) => Promise<HistoryRecord[]>
  deleteHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  getHistoryStats: () => Promise<HistoryStats>
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

export function useElectronAPI(): ElectronAPI {
  const executeTask = useCallback(
    (cliName: string, prompt: string) => window.electronAPI.executeTask(cliName, prompt),
    []
  )

  const cancelTask = useCallback(() => window.electronAPI.cancelTask(), [])

  const onTaskOutput = useCallback(
    (callback: (output: string) => void) => window.electronAPI.onTaskOutput(callback),
    []
  )

  const onTaskComplete = useCallback(
    (callback: (result: { success: boolean; error?: string }) => void) =>
      window.electronAPI.onTaskComplete(callback),
    []
  )

  const getHistory = useCallback(
    (limit?: number, offset?: number) => window.electronAPI.getHistory(limit, offset),
    []
  )

  const searchHistory = useCallback(
    (query: string, cliName?: string) => window.electronAPI.searchHistory(query, cliName),
    []
  )

  const deleteHistory = useCallback(
    (id: string) => window.electronAPI.deleteHistory(id),
    []
  )

  const clearHistory = useCallback(() => window.electronAPI.clearHistory(), [])

  const getHistoryStats = useCallback(() => window.electronAPI.getHistoryStats(), [])

  const getCLIList = useCallback(() => window.electronAPI.getCLIList(), [])

  const updateCLIConfig = useCallback(
    (cliName: string, config: Record<string, unknown>) =>
      window.electronAPI.updateCLIConfig(cliName, config),
    []
  )

  return {
    executeTask,
    cancelTask,
    onTaskOutput,
    onTaskComplete,
    getHistory,
    searchHistory,
    deleteHistory,
    clearHistory,
    getHistoryStats,
    getCLIList,
    updateCLIConfig,
  }
}
