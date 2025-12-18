import { IpcMain, BrowserWindow, dialog } from 'electron'
import { HistoryManager } from '../services/history-manager'
import { CLIManager } from '../services/cli-manager'
import { TaskExecutor } from '../services/task-executor'
import { SessionManager } from '../services/session-manager'

interface Services {
  historyManager: HistoryManager
  cliManager: CLIManager
  taskExecutor: TaskExecutor
  sessionManager: SessionManager
  getMainWindow: () => BrowserWindow | null
}

export function registerIpcHandlers(ipcMain: IpcMain, services: Services): void {
  const { historyManager, cliManager, taskExecutor, sessionManager, getMainWindow } = services

  // Session management handlers
  ipcMain.handle('session-create', async (_event, cliName: string, workingDirectory: string) => {
    const mainWindow = getMainWindow()
    sessionManager.setMainWindow(mainWindow)
    const sessionId = sessionManager.createSession(cliName, workingDirectory)
    return sessionId
  })

  ipcMain.handle('session-send-input', async (_event, sessionId: string, input: string) => {
    return sessionManager.sendInput(sessionId, input)
  })

  ipcMain.handle('session-execute-cli', async (_event, sessionId: string, cliName: string, prompt: string) => {
    return sessionManager.executeCliCommand(sessionId, cliName, prompt)
  })

  ipcMain.handle('session-start-cli', async (_event, sessionId: string, cliName: string) => {
    return sessionManager.startCli(sessionId, cliName)
  })

  ipcMain.handle('session-close', async (_event, sessionId: string) => {
    const result = sessionManager.closeSession(sessionId)

    // 如果关闭成功且有会话数据，保存到历史记录
    if (result.success && result.sessionData) {
      const { sessionData } = result
      // 提取用户发送的所有消息作为 prompt
      const userMessages = sessionData.messages
        .filter((m) => m.type === 'user')
        .map((m) => m.content)
        .join('\n')

      // 保存会话为历史记录
      historyManager.addRecord(
        sessionData.cliName,
        userMessages || '(CLI会话)',
        sessionData.output,
        null, // error
        Date.now() - sessionData.createdAt, // executionTime
        sessionData.workingDirectory
      )
    }

    return result.success
  })

  ipcMain.handle('session-get', async (_event, sessionId: string) => {
    return sessionManager.getSession(sessionId)
  })

  ipcMain.handle('session-get-active', async () => {
    return sessionManager.getActiveSessionId()
  })

  ipcMain.handle('session-set-active', async (_event, sessionId: string | null) => {
    return sessionManager.setActiveSession(sessionId)
  })

  ipcMain.handle('session-get-all', async () => {
    return sessionManager.getAllSessions()
  })

  ipcMain.handle('session-resize', async (_event, sessionId: string, cols: number, rows: number) => {
    return sessionManager.resizeSession(sessionId, cols, rows)
  })

  ipcMain.handle('session-interrupt', async (_event, sessionId: string) => {
    return sessionManager.sendInterrupt(sessionId)
  })

  // Task execution handlers
  ipcMain.handle('execute-task', async (_event, cliName: string, prompt: string, workingDirectory?: string | null) => {
    const mainWindow = getMainWindow()
    const result = await taskExecutor.executeTask(cliName, prompt, mainWindow, workingDirectory)
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

  // Folder selection handler
  ipcMain.handle('select-folder', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择工作目录',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

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
