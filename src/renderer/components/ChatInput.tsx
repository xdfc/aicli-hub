import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useAppStore } from '../store/app-store'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Send, Square, Trash2, FolderOpen } from 'lucide-react'

interface ChatInputProps {
  onSend: (prompt: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [prompt, setPrompt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    clis,
    selectedCLI,
    selectCLI,
    task,
    cancelTask,
    workingDirectory,
    selectWorkingDirectory,
  } = useAppStore()

  const availableCLIs = clis.filter((cli) => cli.available)

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

  const handleSend = () => {
    if (!prompt.trim() || !selectedCLI || task.isRunning) return
    onSend(prompt.trim())
    setPrompt('')
    localStorage.removeItem('chat-draft')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 发送
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

  return (
    <div className="border-t bg-background p-4">
      {/* 工作目录显示 */}
      {workingDirectory && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-muted/50 rounded-md px-3 py-1.5">
          <FolderOpen className="h-3 w-3" />
          <span className="font-mono truncate">{workingDirectory}</span>
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题... (Ctrl+Enter 发送)"
            disabled={task.isRunning}
            className="min-h-[60px] max-h-[200px] pr-20 resize-none font-mono text-sm"
            rows={2}
          />
          {/* 字符计数 */}
          <div className="absolute right-3 bottom-3 text-xs text-muted-foreground">
            {prompt.length}
          </div>
        </div>

        {/* 控制栏 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* CLI 选择 */}
            <Select
              value={selectedCLI || ''}
              onValueChange={selectCLI}
              disabled={task.isRunning}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="选择 CLI" />
              </SelectTrigger>
              <SelectContent>
                {availableCLIs.map((cli) => (
                  <SelectItem
                    key={cli.name}
                    value={cli.name || '__invalid_cli_name__'}
                    disabled={!cli.name}
                  >
                    {cli.displayName}
                    {cli.version && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        v{cli.version}
                      </span>
                    )}
                  </SelectItem>
                ))}
                {availableCLIs.length === 0 && (
                  <SelectItem value="__no-cli__" disabled>
                    没有可用的 CLI 工具
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* 选择目录按钮 */}
            <Button
              variant="outline"
              size="icon"
              onClick={selectWorkingDirectory}
              disabled={task.isRunning}
              title="选择工作目录"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* 清空按钮 */}
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

            {/* 发送/取消按钮 */}
            {task.isRunning ? (
              <Button
                onClick={cancelTask}
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                取消
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!prompt.trim() || !selectedCLI || disabled}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                执行
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
