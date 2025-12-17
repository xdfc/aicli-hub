import execa from 'execa'
import { BaseCLIDriver, CLIInfo, ExecutionResult, ExecutionOptions } from './base-driver'

export class CustomDriver extends BaseCLIDriver {
  private customCommand: string

  constructor(
    name: string,
    displayName: string,
    command: string,
    description = 'Custom CLI command'
  ) {
    super(name, displayName, command, description)
    this.customCommand = command
  }

  async detect(): Promise<CLIInfo> {
    const commandParts = this.customCommand.split(' ')
    const baseCommand = commandParts[0]
    const available = await this.checkCommandExists(baseCommand)

    return {
      name: this.name,
      displayName: this.displayName,
      command: this.customCommand,
      version: null,
      available,
      description: this.description,
      config: this.config,
    }
  }

  async execute(prompt: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now()
    let output = ''
    let error: string | null = null

    try {
      const commandParts = this.customCommand.split(' ')
      const baseCommand = commandParts[0]
      const baseArgs = commandParts.slice(1)

      const subprocess = execa(baseCommand, [...baseArgs, prompt], {
        timeout: options.timeout || 300000,
        reject: false,
      })

      // Handle abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => subprocess.kill())
      }

      if (options.onOutput && subprocess.stdout) {
        subprocess.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString()
          output += text
          options.onOutput?.(text)
        })
      }

      if (subprocess.stderr) {
        subprocess.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString()
          output += text
          options.onOutput?.(text)
        })
      }

      const result = await subprocess

      if (!options.onOutput) {
        output = result.stdout + result.stderr
      }

      if (result.failed && result.exitCode !== 0) {
        error = result.stderr || 'Command failed with exit code ' + result.exitCode
      }

      return {
        success: !result.failed,
        output,
        error,
        executionTime: Date.now() - startTime,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        output,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      }
    }
  }
}
