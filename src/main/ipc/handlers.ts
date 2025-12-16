import { IpcMain, BrowserWindow } from 'electron'
import { HistoryManager } from '../services/history-manager'
import { CLIManager } from '../services/cli-manager'
import { TaskExecutor } from '../services/task-executor'

interface Services {
  historyManager: HistoryManager
  cliManager: CLIManager
  taskExecutor: TaskExecutor
  getMainWindow: () => BrowserWindow | null
}

export function registerIpcHandlers(ipcMain: IpcMain, services: Services): void {
  const { historyManager, cliManager, taskExecutor, getMainWindow } = services

  // Task execution handlers
  ipcMain.handle('execute-task', async (_event, cliName: string, prompt: string) => {
    const mainWindow = getMainWindow()
    const result = await taskExecutor.executeTask(cliName, prompt, mainWindow)
    return result
  })

  ipcMain.handle('cancel-task', async () => {
    return taskExecutor.cancelCurrentTask()
  })

  // History handlers
  ipcMain.handle('get-history', async (_event, limit?: number, offset?: number) => {
    return historyManager.getRecords(limit, offset)
  })

  ipcMain.handle('search-history', async (_event, query: string, cliName?: string) => {
    return historyManager.searchRecords(query, cliName)
  })

  ipcMain.handle('delete-history', async (_event, id: string) => {
    return historyManager.deleteRecord(id)
  })

  ipcMain.handle('clear-history', async () => {
    return historyManager.clearAllRecords()
  })

  ipcMain.handle('get-history-stats', async () => {
    return historyManager.getStats()
  })

  // CLI management handlers
  ipcMain.handle('get-cli-list', async () => {
    // Re-detect all CLIs and return the list
    const cliList = await cliManager.detectAllCLIs()
    return cliList
  })

  ipcMain.handle(
    'update-cli-config',
    async (_event, cliName: string, config: Record<string, unknown>) => {
      const success = cliManager.updateDriverConfig(cliName, config)

      // Also save to database for persistence
      if (success) {
        historyManager.setCLIConfig(cliName, config)
      }

      return success
    }
  )

  // Load saved configs on startup
  const loadSavedConfigs = () => {
    const drivers = cliManager.getAllDrivers()
    for (const driver of drivers) {
      const savedConfig = historyManager.getCLIConfig(driver.getName())
      if (savedConfig) {
        driver.setConfig(savedConfig)
      }
    }
  }

  // Load configs after a short delay to ensure database is ready
  setTimeout(loadSavedConfigs, 100)
}
