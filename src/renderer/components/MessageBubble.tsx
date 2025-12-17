import { useState } from 'react'
import { Button } from './ui/button'
import { Copy, Check, User, Bot, Clock } from 'lucide-react'

interface MessageBubbleProps {
  type: 'user' | 'ai'
  content: string
  timestamp?: number
  executionTime?: number | null
  isStreaming?: boolean
  error?: string | null
}

export default function MessageBubble({
  type,
  content,
  timestamp,
  executionTime,
  isStreaming = false,
  error,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (ts: number): string => {
    const date = new Date(ts)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatExecutionTime = (ms: number | null | undefined): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (type === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-3 max-w-[80%]">
          <div className="flex flex-col items-end">
            <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
            </div>
            {timestamp && (
              <span className="text-xs text-muted-foreground mt-1">
                {formatTime(timestamp)}
              </span>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <div className={`bg-slate-700 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm ${error ? 'border border-destructive/50' : ''}`}>
            <div className="font-mono text-sm whitespace-pre-wrap break-words">
              {content || (
                <span className="text-slate-400">AI 正在思考...</span>
              )}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
              )}
            </div>
            {error && (
              <div className="mt-2 pt-2 border-t border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {formatTime(timestamp)}
              </span>
            )}
            {executionTime && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatExecutionTime(executionTime)}
              </span>
            )}
            {content && !isStreaming && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
