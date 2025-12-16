import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Toaster } from './components/ui/toaster'
import MainPage from './pages/MainPage'
import HistoryPage from './pages/HistoryPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import { useAppStore } from './store/app-store'
import { Terminal, History, Search, Settings } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('main')
  const { loadCLIs, loadHistory } = useAppStore()

  useEffect(() => {
    loadCLIs()
    loadHistory()
  }, [loadCLIs, loadHistory])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 items-center border-b border-border px-4 drag-region">
        <h1 className="text-lg font-semibold">AI CLI Hub</h1>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger value="main" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Execute
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="main" className="m-0 h-full">
            <MainPage />
          </TabsContent>
          <TabsContent value="history" className="m-0 h-full">
            <HistoryPage />
          </TabsContent>
          <TabsContent value="search" className="m-0 h-full">
            <SearchPage />
          </TabsContent>
          <TabsContent value="settings" className="m-0 h-full">
            <SettingsPage />
          </TabsContent>
        </div>
      </Tabs>

      <Toaster />
    </div>
  )
}

export default App
