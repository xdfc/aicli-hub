import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc/handlers'
import { HistoryManager } from './services/history-manager'
import { CLIManager } from './services/cli-manager'
import { TaskExecutor } from './services/task-executor'

let mainWindow: BrowserWindow | null = null
let historyManager: HistoryManager
let cliManager: CLIManager
let taskExecutor: TaskExecutor

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function initializeServices(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'ai-cli-hub.db')

  historyManager = new HistoryManager(dbPath)
  cliManager = new CLIManager()
  taskExecutor = new TaskExecutor(cliManager, historyManager)

  await cliManager.detectAllCLIs()
}

app.whenReady().then(async () => {
  await initializeServices()

  registerIpcHandlers(ipcMain, {
    historyManager,
    cliManager,
    taskExecutor,
    getMainWindow: () => mainWindow,
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  taskExecutor?.cancelCurrentTask()
  historyManager?.close()
})
