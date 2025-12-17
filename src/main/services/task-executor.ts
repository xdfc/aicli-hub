import { BrowserWindow } from 'electron'
import { CLIManager } from './cli-manager'
import { HistoryManager } from './history-manager'
import { ExecutionResult } from '../drivers'

export interface TaskState {
  isRunning: boolean
  cliName: string | null
  startTime: number | null
  abortController: AbortController | null
}

export class TaskExecutor {
  private cliManager: CLIManager
  private historyManager: HistoryManager
  private state: TaskState = {
    isRunning: false,
    cliName: null,
    startTime: null,
    abortController: null,
  }

  constructor(cliManager: CLIManager, historyManager: HistoryManager) {
    this.cliManager = cliManager
    this.historyManager = historyManager
  }

  async executeTask(
    cliName: string,
    prompt: string,
    mainWindow: BrowserWindow | null,
    workingDirectory?: string | null
  ): Promise<ExecutionResult> {
    if (this.state.isRunning) {
      throw new Error('A task is already running')
    }

    const driver = this.cliManager.getDriver(cliName)
    if (!driver) {
      throw new Error(`CLI "${cliName}" not found`)
    }

    const abortController = new AbortController()

    this.state = {
      isRunning: true,
      cliName,
      startTime: Date.now(),
      abortController,
    }

    let output = ''

    try {
      const result = await driver.execute(prompt, {
        timeout: 300000,
        signal: abortController.signal,
        workingDirectory,
        onOutput: (chunk: string) => {
          output += chunk
          mainWindow?.webContents.send('task-output', chunk)
        },
      })

      // Save to history
      this.historyManager.addRecord(
        cliName,
        prompt,
        result.output,
        result.error,
        result.executionTime
      )

      mainWindow?.webContents.send('task-complete', {
        success: result.success,
        error: result.error,
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const executionTime = Date.now() - (this.state.startTime || Date.now())

      // Save error to history
      this.historyManager.addRecord(cliName, prompt, output, errorMessage, executionTime)

      mainWindow?.webContents.send('task-complete', {
        success: false,
        error: errorMessage,
      })

      return {
        success: false,
        output,
        error: errorMessage,
        executionTime,
      }
    } finally {
      this.resetState()
    }
  }

  cancelCurrentTask(): boolean {
    if (!this.state.isRunning || !this.state.abortController) {
      return false
    }

    this.state.abortController.abort()
    this.resetState()
    return true
  }

  isRunning(): boolean {
    return this.state.isRunning
  }

  getCurrentCLI(): string | null {
    return this.state.cliName
  }

  getElapsedTime(): number {
    if (!this.state.startTime) return 0
    return Date.now() - this.state.startTime
  }

  private resetState(): void {
    this.state = {
      isRunning: false,
      cliName: null,
      startTime: null,
      abortController: null,
    }
  }
}
