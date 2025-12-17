import { useRef, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/app-store'
import { ScrollArea } from './ui/scroll-area'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Terminal, FolderOpen, Play, Send, Square, Trash2 } from 'lucide-react'
import { Textarea } from './ui/textarea'

export default function ChatArea() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [prompt, setPrompt] = useState('')

  const {
    clis,
    selectedCLI,
    selectCLI,
    task,
    executeTask,
    cancelTask,
    workingDirectory,
    selectWorkingDirectory,
    history,
    selectedHistoryId,
    currentSessionId,
    sessionOutput,
    createSession,
  } = useAppStore()

  const availableCLIs = clis.filter((cli) => cli.available)

  // 获取当前选中的历史记录
  const selectedHistory = useMemo(() => {
    if (!selectedHistoryId) return null
    return history.find((h) => h.id === selectedHistoryId) || null
  }, [history, selectedHistoryId])

  // 获取当前CLI显示名称
  const currentCLIName = useMemo(() => {
    if (selectedHistory?.cliName) {
      const cli = clis.find((c) => c.name === selectedHistory.cliName)
      return cli?.displayName || selectedHistory.cliName
    }
    if (selectedCLI) {
      const cli = clis.find((c) => c.name === selectedCLI)
      return cli?.displayName || selectedCLI
    }
    return '未选择'
  }, [clis, selectedCLI, selectedHistory])

  // 获取当前工作目录
  const currentWorkingDir = selectedHistory?.workingDirectory || workingDirectory

  // 是否可以开始对话
  const canStartSession = selectedCLI && workingDirectory && !currentSessionId && !selectedHistoryId

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [task.output, selectedHistory, sessionOutput])

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [prompt])

  // 保存草稿到 localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem('chat-draft')
    if (savedDraft) {
      setPrompt(savedDraft)
    }
  }, [])

  useEffect(() => {
    if (prompt) {
      localStorage.setItem('chat-draft', prompt)
    } else {
      localStorage.removeItem('chat-draft')
    }
  }, [prompt])

  const handleStartSession = async () => {
    if (!selectedCLI || !workingDirectory) return
    await createSession()
  }

  const handleSend = async () => {
    if (!prompt.trim() || task.isRunning) return
    const inputPrompt = prompt.trim()
    setPrompt('')
    localStorage.removeItem('chat-draft')
    await executeTask(inputPrompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setPrompt('')
    localStorage.removeItem('chat-draft')
    textareaRef.current?.focus()
  }

  // 显示的内容
  const displayContent = useMemo(() => {
    if (selectedHistory) {
      return {
        type: 'history' as const,
        prompt: selectedHistory.prompt,
        output: selectedHistory.output || '',
        error: selectedHistory.error,
      }
    }
    if (currentSessionId) {
      return {
        type: 'session' as const,
        output: sessionOutput,
      }
    }
    if (task.output) {
      return {
        type: 'task' as const,
        output: task.output,
        error: task.error,
      }
    }
    return null
  }, [selectedHistory, currentSessionId, sessionOutput, task])

  // 渲染欢迎/配置界面
  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
      <Terminal className="h-16 w-16 text-muted-foreground/30 mb-6" />
      <h3 className="text-xl font-semibold mb-2">AI CLI Hub</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        选择一个 CLI 工具和工作目录，开始您的终端会话。
        <br />
        所有对话都会在同一个终端会话中保持上下文。
      </p>

      {/* CLI 和目录选择区域 */}
      <div className="w-full max-w-md space-y-4">
        {/* CLI 选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-left block">CLI 工具</label>
          <Select
            value={selectedCLI || ''}
            onValueChange={selectCLI}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择 CLI 工具" />
            </SelectTrigger>
            <SelectContent>
              {availableCLIs.map((cli) => (
                <SelectItem
                  key={cli.name}
                  value={cli.name || '__invalid_cli_name__'}
                  disabled={!cli.name}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    <span>{cli.displayName}</span>
                    {cli.version && (
                      <span className="text-xs text-muted-foreground">v{cli.version}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {availableCLIs.length === 0 && (
                <SelectItem value="__no-cli__" disabled>
                  没有可用的 CLI 工具
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 目录选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-left block">工作目录</label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={selectWorkingDirectory}
              className="flex-1 justify-start gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              {workingDirectory ? (
                <span className="truncate font-mono text-sm">{workingDirectory}</span>
              ) : (
                <span className="text-muted-foreground">选择目录...</span>
              )}
            </Button>
          </div>
          {!workingDirectory && (
            <p className="text-xs text-muted-foreground text-left">
              选择项目工作目录以启动终端会话
            </p>
          )}
        </div>

        {/* 开始按钮 */}
        <Button
          onClick={handleStartSession}
          disabled={!canStartSession}
          className="w-full gap-2"
          size="lg"
        >
          <Play className="h-4 w-4" />
          开始会话
        </Button>
      </div>
    </div>
  )

  // 渲染终端输出区域
  const renderTerminal = () => (
    <div className="flex-1 bg-zinc-900 text-green-400 font-mono text-sm p-4 overflow-auto whitespace-pre-wrap">
      {displayContent?.output || ''}
      {task.isRunning && (
        <span className="animate-pulse">▊</span>
      )}
      {displayContent?.type === 'history' && displayContent.error && (
        <div className="text-red-400 mt-2">
          错误: {displayContent.error}
        </div>
      )}
      {displayContent?.type === 'task' && displayContent.error && (
        <div className="text-red-400 mt-2">
          错误: {displayContent.error}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col min-w-0 h-full">
      {/* 顶部信息栏 - 会话活跃时显示 */}
      {(currentSessionId || selectedHistory) && (
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{currentCLIName}</span>
            </div>
            {currentWorkingDir && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm font-mono truncate max-w-[300px]">
                  {currentWorkingDir}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.isRunning && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-sm text-muted-foreground">执行中...</span>
              </>
            )}
            {currentSessionId && (
              <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">
                会话活跃
              </span>
            )}
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="min-h-full">
          {!currentSessionId && !selectedHistory && !task.output ? (
            renderWelcome()
          ) : (
            <div className="p-4">
              {/* 历史记录模式 - 显示用户问题 */}
              {displayContent?.type === 'history' && displayContent.prompt && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-xs text-blue-500 mb-1">用户输入</div>
                  <div className="text-sm">{displayContent.prompt}</div>
                </div>
              )}
              {/* 终端输出 */}
              <div className="bg-zinc-900 rounded-lg overflow-hidden">
                {renderTerminal()}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区域 - 会话活跃时显示 */}
      {(currentSessionId || (selectedCLI && workingDirectory && !selectedHistory)) && (
        <div className="border-t bg-background p-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentSessionId ? "输入命令... (Ctrl+Enter 执行)" : "请先开始会话"}
                disabled={task.isRunning || !currentSessionId}
                className="min-h-[60px] max-h-[200px] pr-20 resize-none font-mono text-sm"
                rows={2}
              />
              <div className="absolute right-3 bottom-3 text-xs text-muted-foreground">
                {prompt.length}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {prompt && !task.isRunning && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  title="清空"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {task.isRunning ? (
                <Button
                  onClick={cancelTask}
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  中断
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!prompt.trim() || !currentSessionId}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
