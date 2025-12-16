import { execa } from 'execa'
import { BaseCLIDriver, CLIInfo, ExecutionResult, ExecutionOptions } from './base-driver'

export class OllamaDriver extends BaseCLIDriver {
  constructor() {
    super(
      'ollama',
      'Ollama',
      'ollama',
      'Ollama - Run LLMs locally'
    )
    this.config = {
      model: 'llama2',
    }
  }

  async detect(): Promise<CLIInfo> {
    const available = await this.checkCommandExists('ollama')
    let version: string | null = null

    if (available) {
      version = await this.getCommandVersion('ollama', '--version')
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
      const model = String(this.config.model || 'llama2')
      const args = ['run', model, prompt]

      const subprocess = execa('ollama', args, {
        timeout: options.timeout || 300000,
        reject: false,
        signal: options.signal,
      })

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
        error = result.stderr || 'Ollama command failed'
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
