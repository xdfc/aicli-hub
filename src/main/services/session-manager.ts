import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import * as os from 'os'

export interface Session {
  id: string
  cliName: string
  workingDirectory: string
  pty: pty.IPty
  createdAt: number
  messages: SessionMessage[]
  output: string // 保存完整的会话输出
}

export interface SessionMessage {
  id: string
  type: 'user' | 'system'
  content: string
  timestamp: number
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private activeSessionId: string | null = null
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window
  }

  /**
   * 创建新会话
   */
  createSession(cliName: string, workingDirectory: string): string {
    const sessionId = uuidv4()

    // 获取对应CLI的启动命令
    const { command, args } = this.getCliCommand(cliName)

    // 创建PTY，直接启动CLI工具
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: workingDirectory,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      } as { [key: string]: string },
    })

    const session: Session = {
      id: sessionId,
      cliName,
      workingDirectory,
      pty: ptyProcess,
      createdAt: Date.now(),
      messages: [],
      output: '',
    }

    // 监听PTY输出
    ptyProcess.onData((data: string) => {
      this.handlePtyOutput(sessionId, data)
    })

    // 监听PTY退出
    ptyProcess.onExit(({ exitCode }) => {
      this.handlePtyExit(sessionId, exitCode)
    })

    this.sessions.set(sessionId, session)
    this.activeSessionId = sessionId

    // 发送会话创建事件
    this.mainWindow?.webContents.send('session-created', {
      sessionId,
      cliName,
      workingDirectory,
    })

    return sessionId
  }

  /**
   * 获取CLI启动命令
   */
  private getCliCommand(cliName: string): { command: string; args: string[] } {
    switch (cliName) {
      case 'claude':
        return { command: 'claude', args: [] }
      case 'qwen':
        return { command: 'qwen', args: ['chat'] }
      case 'ollama':
        return { command: 'ollama', args: ['run', 'llama2'] }
      default:
        // 对于自定义CLI，使用shell
        return { command: this.getShellForPlatform(), args: [] }
    }
  }

  /**
   * 向会话发送输入
   */
  sendInput(sessionId: string, input: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    // 记录用户消息
    const userMessage: SessionMessage = {
      id: uuidv4(),
      type: 'user',
      content: input,
      timestamp: Date.now(),
    }
    session.messages.push(userMessage)

    // 发送到PTY（添加换行符执行命令）
    session.pty.write(input + '\r')

    // 发送用户消息事件
    this.mainWindow?.webContents.send('session-user-input', {
      sessionId,
      message: userMessage,
    })

    return true
  }

  /**
   * 执行CLI命令（用于直接执行如claude命令）
   */
  executeCliCommand(sessionId: string, cliName: string, prompt: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    // 构建CLI命令
    let command: string
    switch (cliName) {
      case 'claude':
        // 对于claude，使用交互模式或者-p参数
        // 这里我们直接输入，让用户在交互式环境中使用
        command = prompt
        break
      case 'qwen':
        command = prompt
        break
      case 'ollama':
        command = prompt
        break
      default:
        command = prompt
    }

    return this.sendInput(sessionId, command)
  }

  /**
   * 启动CLI工具
   */
  startCli(sessionId: string, cliName: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    // 启动对应的CLI工具
    let command: string
    switch (cliName) {
      case 'claude':
        command = 'claude'
        break
      case 'qwen':
        command = 'qwen chat'
        break
      case 'ollama':
        command = 'ollama run llama2'
        break
      default:
        command = cliName
    }

    session.pty.write(command + '\r')
    return true
  }

  /**
   * 处理PTY输出
   */
  private handlePtyOutput(sessionId: string, data: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // 累积输出
    session.output += data

    // 发送输出到前端
    this.mainWindow?.webContents.send('session-output', {
      sessionId,
      data,
    })
  }

  /**
   * 处理PTY退出
   */
  private handlePtyExit(sessionId: string, exitCode: number) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    this.mainWindow?.webContents.send('session-exit', {
      sessionId,
      exitCode,
    })

    // 如果是活跃会话退出，清除活跃状态
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null
    }
  }

  /**
   * 关闭会话并返回会话信息
   */
  closeSession(sessionId: string): { success: boolean; sessionData?: Omit<Session, 'pty'> } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false }
    }

    // 保存会话数据（不包含pty对象）
    const sessionData: Omit<Session, 'pty'> = {
      id: session.id,
      cliName: session.cliName,
      workingDirectory: session.workingDirectory,
      createdAt: session.createdAt,
      messages: session.messages,
      output: session.output,
    }

    // 终止PTY进程
    session.pty.kill()
    this.sessions.delete(sessionId)

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null
    }

    this.mainWindow?.webContents.send('session-closed', { sessionId, sessionData })
    return { success: true, sessionData }
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): Omit<Session, 'pty'> | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    // 返回会话信息（不包含pty对象）
    return {
      id: session.id,
      cliName: session.cliName,
      workingDirectory: session.workingDirectory,
      createdAt: session.createdAt,
      messages: session.messages,
      output: session.output,
    }
  }

  /**
   * 获取活跃会话ID
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId
  }

  /**
   * 设置活跃会话
   */
  setActiveSession(sessionId: string | null): boolean {
    if (sessionId === null) {
      this.activeSessionId = null
      return true
    }

    if (!this.sessions.has(sessionId)) {
      return false
    }

    this.activeSessionId = sessionId
    return true
  }

  /**
   * 获取所有会话列表
   */
  getAllSessions(): Array<Omit<Session, 'pty'>> {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      cliName: session.cliName,
      workingDirectory: session.workingDirectory,
      createdAt: session.createdAt,
      messages: session.messages,
      output: session.output,
    }))
  }

  /**
   * 调整PTY大小
   */
  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.pty.resize(cols, rows)
    return true
  }

  /**
   * 关闭所有会话
   */
  closeAllSessions(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill()
    }
    this.sessions.clear()
    this.activeSessionId = null
  }

  /**
   * 获取平台对应的shell
   */
  private getShellForPlatform(): string {
    const platform = os.platform()
    if (platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    }
    return process.env.SHELL || '/bin/bash'
  }

  /**
   * 发送中断信号（Ctrl+C）
   */
  sendInterrupt(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.pty.write('\x03') // Ctrl+C
    return true
  }
}
