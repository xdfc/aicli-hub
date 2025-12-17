import { useRef, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/app-store'
import { ScrollArea } from './ui/scroll-area'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { Terminal, FolderOpen, MessageSquare } from 'lucide-react'

export default function ChatArea() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const {
    clis,
    selectedCLI,
    task,
    executeTask,
    clearOutput,
    workingDirectory,
    history,
    selectedHistoryId,
  } = useAppStore()

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

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [task.output, selectedHistory])

  const handleSend = async (prompt: string) => {
    clearOutput()
    await executeTask(prompt)
  }

  // 构建消息列表
  const messages = useMemo(() => {
    if (selectedHistory) {
      // 显示历史记录的消息
      return [
        {
          type: 'user' as const,
          content: selectedHistory.prompt,
          timestamp: selectedHistory.timestamp,
        },
        {
          type: 'ai' as const,
          content: selectedHistory.output || '',
          timestamp: selectedHistory.timestamp,
          executionTime: selectedHistory.executionTime,
          error: selectedHistory.error,
        },
      ]
    }

    // 显示当前任务的消息（如果有）
    if (task.output || task.isRunning) {
      // 注意：这里我们没有单独保存用户输入，需要从其他地方获取
      // 暂时只显示AI响应
      return [
        {
          type: 'ai' as const,
          content: task.output,
          timestamp: task.startTime || Date.now(),
          executionTime: task.startTime ? Date.now() - task.startTime : null,
          error: task.error,
          isStreaming: task.isRunning,
        },
      ]
    }

    return []
  }, [selectedHistory, task])

  return (
    <div className="flex flex-1 flex-col min-w-0 h-full">
      {/* 顶部信息栏 */}
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
        {task.isRunning && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm text-muted-foreground">执行中...</span>
          </div>
        )}
      </div>

      {/* 消息流区域 */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">开始新对话</h3>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-sm">
                选择一个 CLI 工具，输入您的问题或指令，然后点击执行开始对话。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={index}
                  type={msg.type}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  executionTime={msg.type === 'ai' ? msg.executionTime : undefined}
                  error={msg.type === 'ai' ? msg.error : undefined}
                  isStreaming={msg.type === 'ai' && 'isStreaming' in msg ? msg.isStreaming : false}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
