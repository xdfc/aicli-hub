import { useState, useMemo } from 'react'
import { useAppStore, HistoryRecord } from '../store/app-store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import {
  Plus,
  Search,
  Settings,
  BarChart2,
  Calendar,
  Trash2,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface SidebarProps {
  onNewConversation: () => void
  onOpenSettings: () => void
  onOpenStats: () => void
}

export default function Sidebar({ onNewConversation, onOpenSettings, onOpenStats }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const {
    clis,
    history,
    selectedHistoryId,
    selectHistory,
    deleteHistory,
    setTaskOutput,
    selectCLI,
    setWorkingDirectory,
    setViewMode,
  } = useAppStore()

  // 按日期分组历史记录
  const groupedHistory = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    // 搜索过滤
    const filteredHistory = searchQuery.trim()
      ? history.filter(
          (record) =>
            record.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (record.output && record.output.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : history

    const groups: { label: string; records: HistoryRecord[] }[] = [
      { label: '今天', records: [] },
      { label: '昨天', records: [] },
      { label: '更早', records: [] },
    ]

    filteredHistory.forEach((record) => {
      const recordDate = new Date(record.timestamp)
      if (recordDate >= today) {
        groups[0].records.push(record)
      } else if (recordDate >= yesterday) {
        groups[1].records.push(record)
      } else {
        groups[2].records.push(record)
      }
    })

    return groups.filter((group) => group.records.length > 0)
  }, [history, searchQuery])

  const getCLIDisplayName = (cliName: string): string => {
    const cli = clis.find((c) => c.name === cliName)
    return cli?.displayName || cliName
  }

  const handleHistoryClick = (record: HistoryRecord) => {
    selectHistory(record.id)
    if (record.cliName) {
      selectCLI(record.cliName)
    }
    if (record.workingDirectory !== undefined) {
      setWorkingDirectory(record.workingDirectory)
    }
    setTaskOutput(record.output || '', record.error)
    // 切换到chat视图
    setViewMode('chat')
  }

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteHistory(id)
  }

  const truncateText = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="flex h-full w-[280px] flex-col border-r bg-muted/30">
      {/* 新建对话按钮 */}
      <div className="p-3 border-b">
        <Button
          onClick={onNewConversation}
          className="w-full gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          新建对话
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="pl-9"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        {groupedHistory.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? '没有找到匹配的对话' : '暂无对话历史'}
          </div>
        ) : (
          <div className="py-2">
            {groupedHistory.map((group) => (
              <div key={group.label} className="mb-2">
                {/* 分组标题 */}
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {group.label}
                </div>
                {/* 对话列表 */}
                <div className="space-y-1 px-2">
                  {group.records.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => handleHistoryClick(record)}
                      className={`group flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                        selectedHistoryId === record.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{truncateText(record.prompt)}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {getCLIDisplayName(record.cliName)}
                          </span>
                          {record.error ? (
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteHistory(record.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 底部菜单 */}
      <div className="border-t p-3 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
          设置
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={onOpenStats}
        >
          <BarChart2 className="h-4 w-4" />
          统计
        </Button>
      </div>
    </div>
  )
}
