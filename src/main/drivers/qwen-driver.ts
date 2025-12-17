import execa from 'execa'
import { BaseCLIDriver, CLIInfo, ExecutionResult, ExecutionOptions } from './base-driver'

export class QwenDriver extends BaseCLIDriver {
  constructor() {
    super(
      'qwen',
      'Qwen Code',
      'qwen',
      'Alibaba Qwen Code CLI - AI coding assistant'
    )
  }

  async detect(): Promise<CLIInfo> {
    const available = await this.checkCommandExists('qwen')
    let version: string | null = null

    if (available) {
      version = await this.getCommandVersion('qwen', '--version')
    }

    return {
      name: this.name,
      displayName: this.displayName,
      command: this.command,
      version,
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
      const args = ['chat', prompt]

      const subprocess = execa('qwen', args, {
        timeout: options.timeout || 300000,
        reject: false,
        cwd: options.workingDirectory || undefined,
        env: {
          ...process.env,
          ...(this.config.apiKey ? { QWEN_API_KEY: String(this.config.apiKey) } : {}),
        },
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
        error = result.stderr || 'Qwen command failed'
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
