import { useState, useRef, useEffect } from 'react'
import { useAppStore, HistoryRecord } from '../store/app-store'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { ScrollArea } from '../components/ui/scroll-area'
import { Play, Square, Clock, AlertCircle, CheckCircle, FolderOpen, Trash2 } from 'lucide-react'

export default function MainPage() {
  const [prompt, setPrompt] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)
  const {
    clis,
    selectedCLI,
    selectCLI,
    task,
    executeTask,
    cancelTask,
    clearOutput,
    workingDirectory,
    selectWorkingDirectory,
    history,
    selectedHistoryId,
    selectHistory,
    deleteHistory,
  } = useAppStore()

  const availableCLIs = clis.filter((cli) => cli.available)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [task.output])

  const handleExecute = async () => {
    if (!prompt.trim() || !selectedCLI) return
    clearOutput()
    await executeTask(prompt)
  }

  const handleCancel = async () => {
    await cancelTask()
  }

  const formatTime = (ms: number | null): string => {
    if (!ms) return '0.0s'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getElapsedTime = (): number => {
    if (!task.startTime) return 0
    return Date.now() - task.startTime
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  }

  const getCLIDisplayName = (cliName: string): string => {
    const cli = clis.find((c) => c.name === cliName)
    return cli?.displayName || cliName
  }

  const handleHistoryClick = (record: HistoryRecord) => {
    selectHistory(record.id)
    setPrompt(record.prompt)
  }

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteHistory(id)
  }

  return (
    <div className="flex h-full">
      {/* 左侧历史面板 */}
      <div className="flex w-72 flex-col border-r">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">对话历史</h3>
        </div>
        <ScrollArea className="flex-1">
          {history.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              暂无历史记录
            </div>
          ) : (
            <div className="divide-y">
              {history.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleHistoryClick(record)}
                  className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedHistoryId === record.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {getCLIDisplayName(record.cliName)}
                        </span>
                        {record.error ? (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        ) : (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm truncate">{record.prompt}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(record.timestamp)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 hover:opacity-100"
                      onClick={(e) => handleDeleteHistory(record.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 右侧主内容区 */}
      <div className="flex-1 flex flex-col p-4 gap-4 min-w-0">
        {/* CLI 选择、目录选择和控制 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 max-w-xs min-w-[200px]">
            <Select
              value={selectedCLI || ''}
              onValueChange={selectCLI}
              disabled={task.isRunning}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择 CLI 工具" />
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
                      <span className="ml-2 text-xs text-muted-foreground">v{cli.version}</span>
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
          </div>

          <Button
            variant="outline"
            onClick={selectWorkingDirectory}
            disabled={task.isRunning}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            选择目录
          </Button>

          {task.isRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>{formatTime(getElapsedTime())}</span>
            </div>
          )}

          {!task.isRunning && task.error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>错误</span>
            </div>
          )}

          {!task.isRunning && task.output && !task.error && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>已完成</span>
            </div>
          )}
        </div>

        {/* 当前工作目录显示 */}
        {workingDirectory && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <FolderOpen className="h-4 w-4" />
            <span className="font-mono truncate">{workingDirectory}</span>
          </div>
        )}

        {/* 提示输入 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">提示</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="在此输入您的提示..."
            disabled={task.isRunning}
            className="min-h-[140px] font-mono text-sm resize-none"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {!task.isRunning ? (
            <Button
              onClick={handleExecute}
              disabled={!prompt.trim() || !selectedCLI}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              执行
            </Button>
          ) : (
            <Button onClick={handleCancel} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              取消
            </Button>
          )}

          {task.output && !task.isRunning && (
            <Button variant="outline" onClick={clearOutput}>
              清除输出
            </Button>
          )}
        </div>

        {/* 输出显示 */}
        <div className="flex flex-1 flex-col gap-2 min-h-0">
          <label className="text-sm font-medium">输出</label>
          <ScrollArea className="flex-1 rounded-md border bg-muted/30">
            <div
              ref={outputRef}
              className="p-4 font-mono text-sm whitespace-pre-wrap break-words"
            >
              {task.output || (
                <span className="text-muted-foreground">
                  输出将显示在这里...
                </span>
              )}
              {task.isRunning && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
              )}
            </div>
          </ScrollArea>

          {task.error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {task.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}