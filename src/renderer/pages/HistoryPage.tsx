import { useState } from 'react'
import { useAppStore, HistoryRecord } from '../store/app-store'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { Separator } from '../components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Trash2, Clock, AlertCircle, CheckCircle, Terminal } from 'lucide-react'

export default function HistoryPage() {
  const [showClearDialog, setShowClearDialog] = useState(false)
  const { history, selectedHistoryId, selectHistory, deleteHistory, clearAllHistory, clis } =
    useAppStore()

  const selectedRecord = history.find((r) => r.id === selectedHistoryId)

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatTime = (ms: number | null): string => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getCLIDisplayName = (cliName: string): string => {
    const cli = clis.find((c) => c.name === cliName)
    return cli?.displayName || cliName
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteHistory(id)
  }

  const handleClearAll = async () => {
    await clearAllHistory()
    setShowClearDialog(false)
  }

  return (
    <div className="flex h-full">
      {/* History List */}
      <div className="flex w-80 flex-col border-r">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            disabled={history.length === 0}
            className="text-destructive hover:text-destructive"
          >
            Clear All
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {history.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No history records yet
            </div>
          ) : (
            <div className="divide-y">
              {history.map((record) => (
                <div
                  key={record.id}
                  onClick={() => selectHistory(record.id)}
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
                        {record.executionTime && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span>{formatTime(record.executionTime)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                      onClick={(e) => handleDelete(record.id, e)}
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

      {/* Detail Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRecord ? (
          <HistoryDetail
            record={selectedRecord}
            cliDisplayName={getCLIDisplayName(selectedRecord.cliName)}
            onDelete={() => deleteHistory(selectedRecord.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a record to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All History</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all history records? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface HistoryDetailProps {
  record: HistoryRecord
  cliDisplayName: string
  onDelete: () => void
}

function HistoryDetail({ record, cliDisplayName, onDelete }: HistoryDetailProps) {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatTime = (ms: number | null): string => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
              {cliDisplayName}
            </span>
            {record.error ? (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Error
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Success
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{formatDate(record.timestamp)}</span>
          <span>·</span>
          <span>Duration: {formatTime(record.executionTime)}</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Prompt</h3>
            <div className="p-3 rounded-md bg-muted font-mono text-sm whitespace-pre-wrap">
              {record.prompt}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">Output</h3>
            <div className="p-3 rounded-md bg-muted font-mono text-sm whitespace-pre-wrap break-words">
              {record.output || (
                <span className="text-muted-foreground">No output</span>
              )}
            </div>
          </div>

          {record.error && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2 text-destructive">Error</h3>
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 font-mono text-sm text-destructive whitespace-pre-wrap">
                  {record.error}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </>
  )
}
