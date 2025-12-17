import { useCallback, useMemo } from 'react'
import { getAPI } from '../lib/local-api'

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
  const api = useMemo(() => getAPI(), [])

  const executeTask = useCallback(
    (cliName: string, prompt: string) => api.executeTask(cliName, prompt),
    [api]
  )

  const cancelTask = useCallback(() => api.cancelTask(), [api])

  const onTaskOutput = useCallback(
    (callback: (output: string) => void) => api.onTaskOutput(callback),
    [api]
  )

  const onTaskComplete = useCallback(
    (callback: (result: { success: boolean; error?: string }) => void) =>
      api.onTaskComplete(callback),
    [api]
  )

  const getHistory = useCallback(
    (limit?: number, offset?: number) => api.getHistory(limit, offset),
    [api]
  )

  const searchHistory = useCallback(
    (query: string, cliName?: string) => api.searchHistory(query, cliName),
    [api]
  )

  const deleteHistory = useCallback(
    (id: string) => api.deleteHistory(id),
    [api]
  )

  const clearHistory = useCallback(() => api.clearHistory(), [api])

  const getHistoryStats = useCallback(() => api.getHistoryStats(), [api])

  const getCLIList = useCallback(() => api.getCLIList(), [api])

  const updateCLIConfig = useCallback(
    (cliName: string, config: Record<string, unknown>) =>
      api.updateCLIConfig(cliName, config),
    [api]
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
