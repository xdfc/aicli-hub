import { execa, ExecaChildProcess, Options } from 'execa'

export interface CLIInfo {
  name: string
  displayName: string
  command: string
  version: string | null
  available: boolean
  description: string
  config?: Record<string, unknown>
}

export interface ExecutionResult {
  success: boolean
  output: string
  error: string | null
  executionTime: number
}

export interface ExecutionOptions {
  timeout?: number
  onOutput?: (chunk: string) => void
  signal?: AbortSignal
}

export abstract class BaseCLIDriver {
  protected name: string
  protected displayName: string
  protected command: string
  protected description: string
  protected config: Record<string, unknown> = {}

  constructor(
    name: string,
    displayName: string,
    command: string,
    description: string
  ) {
    this.name = name
    this.displayName = displayName
    this.command = command
    this.description = description
  }

  abstract detect(): Promise<CLIInfo>

  abstract execute(prompt: string, options?: ExecutionOptions): Promise<ExecutionResult>

  getName(): string {
    return this.name
  }

  getDisplayName(): string {
    return this.displayName
  }

  getCommand(): string {
    return this.command
  }

  getDescription(): string {
    return this.description
  }

  setConfig(config: Record<string, unknown>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): Record<string, unknown> {
    return this.config
  }

  protected async checkCommandExists(command: string): Promise<boolean> {
    try {
      const whichCommand = process.platform === 'win32' ? 'where' : 'which'
      await execa(whichCommand, [command])
      return true
    } catch {
      return false
    }
  }

  protected async getCommandVersion(
    command: string,
    versionArg = '--version'
  ): Promise<string | null> {
    try {
      const { stdout } = await execa(command, [versionArg])
      const versionMatch = stdout.match(/(\d+\.\d+\.?\d*)/);
      return versionMatch ? versionMatch[1] : stdout.trim().split('\n')[0]
    } catch {
      return null
    }
  }

  protected createProcess(
    command: string,
    args: string[],
    options: Options = {}
  ): ExecaChildProcess {
    return execa(command, args, {
      ...options,
      reject: false,
    })
  }
}
