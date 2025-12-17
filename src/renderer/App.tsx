import { useState, useEffect } from 'react'
import { Toaster } from './components/ui/toaster'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import NewConversationDialog from './components/NewConversationDialog'
import SettingsPage from './pages/SettingsPage'
import SearchPage from './pages/SearchPage'
import { useAppStore } from './store/app-store'

type ViewMode = 'chat' | 'settings' | 'stats'

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [newConversationOpen, setNewConversationOpen] = useState(false)
  const { loadCLIs, loadHistory } = useAppStore()

  useEffect(() => {
    loadCLIs()
    loadHistory()
  }, [loadCLIs, loadHistory])

  const handleNewConversation = () => {
    setNewConversationOpen(true)
  }

  const handleOpenSettings = () => {
    setViewMode('settings')
  }

  const handleOpenStats = () => {
    setViewMode('stats')
  }

  const handleBackToChat = () => {
    setViewMode('chat')
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 左侧栏 */}
      <Sidebar
        onNewConversation={handleNewConversation}
        onOpenSettings={handleOpenSettings}
        onOpenStats={handleOpenStats}
      />

      {/* 中央区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏（仅在非聊天视图时显示返回按钮） */}
        {viewMode !== 'chat' && (
          <header className="flex h-12 items-center justify-between border-b border-border px-4 drag-region">
            <button
              onClick={handleBackToChat}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors no-drag-region"
            >
              ← 返回对话
            </button>
            <h1 className="text-lg font-semibold no-drag-region">
              {viewMode === 'settings' ? '设置' : '统计'}
            </h1>
            <div className="w-16" /> {/* 占位符保持标题居中 */}
          </header>
        )}

        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'chat' && <ChatArea />}
          {viewMode === 'settings' && <SettingsPage />}
          {viewMode === 'stats' && <SearchPage />}
        </div>
      </div>

      {/* 新建对话弹窗 */}
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
      />

      <Toaster />
    </div>
  )
}

export default App
