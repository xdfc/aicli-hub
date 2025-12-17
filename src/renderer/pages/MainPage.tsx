import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/app-store'
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
import { Play, Square, Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function MainPage() {
  const [prompt, setPrompt] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)
  const { clis, selectedCLI, selectCLI, task, executeTask, cancelTask, clearOutput } = useAppStore()

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

  return (
    <div className="flex h-full flex-col p-4 gap-4">
      {/* CLI Selection and Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <Select
            value={selectedCLI || ''}
            onValueChange={selectCLI}
            disabled={task.isRunning}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select CLI tool" />
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
                  No CLI tools available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {task.isRunning && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>{formatTime(getElapsedTime())}</span>
          </div>
        )}

        {!task.isRunning && task.error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Error</span>
          </div>
        )}

        {!task.isRunning && task.output && !task.error && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Completed</span>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Prompt</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          disabled={task.isRunning}
          className="min-h-[140px] font-mono text-sm resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!task.isRunning ? (
          <Button
            onClick={handleExecute}
            disabled={!prompt.trim() || !selectedCLI}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Execute
          </Button>
        ) : (
          <Button onClick={handleCancel} variant="destructive" className="gap-2">
            <Square className="h-4 w-4" />
            Cancel
          </Button>
        )}

        {task.output && !task.isRunning && (
          <Button variant="outline" onClick={clearOutput}>
            Clear Output
          </Button>
        )}
      </div>

      {/* Output Display */}
      <div className="flex flex-1 flex-col gap-2 min-h-0">
        <label className="text-sm font-medium">Output</label>
        <ScrollArea className="flex-1 rounded-md border bg-muted/30">
          <div
            ref={outputRef}
            className="p-4 font-mono text-sm whitespace-pre-wrap break-words"
          >
            {task.output || (
              <span className="text-muted-foreground">
                Output will appear here...
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
  )
}
