import { useState } from 'react'
import { useAppStore } from '../store/app-store'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { ScrollArea } from '../components/ui/scroll-area'
import { Separator } from '../components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { CheckCircle, XCircle, RefreshCw, Save, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const { clis, loadCLIs, updateCLIConfig } = useAppStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({})

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadCLIs()
    setIsRefreshing(false)
  }

  const handleApiKeyChange = (cliName: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [cliName]: value }))
    setSavedStatus((prev) => ({ ...prev, [cliName]: false }))
  }

  const handleSaveApiKey = async (cliName: string) => {
    const apiKey = apiKeys[cliName]
    if (apiKey !== undefined) {
      await updateCLIConfig(cliName, { apiKey })
      setSavedStatus((prev) => ({ ...prev, [cliName]: true }))
      setTimeout(() => {
        setSavedStatus((prev) => ({ ...prev, [cliName]: false }))
      }, 2000)
    }
  }

  const toggleShowApiKey = (cliName: string) => {
    setShowApiKeys((prev) => ({ ...prev, [cliName]: !prev[cliName] }))
  }

  const getApiKeyEnvVar = (cliName: string): string => {
    switch (cliName) {
      case 'claude':
        return 'ANTHROPIC_API_KEY'
      case 'qwen':
        return 'QWEN_API_KEY'
      case 'ollama':
        return 'OLLAMA_HOST'
      default:
        return 'API_KEY'
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">设置</h1>
            <p className="text-muted-foreground">
              管理您的 CLI 工具和配置
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新 CLI
          </Button>
        </div>

        <Separator />

        {/* CLI 工具部分 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">CLI 工具</h2>
          <div className="space-y-4">
            {clis.map((cli) => (
              <Card key={cli.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">{cli.displayName}</CardTitle>
                      {cli.available ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                          <CheckCircle className="h-3 w-3" />
                          可用
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" />
                          未找到
                        </span>
                      )}
                    </div>
                    {cli.version && (
                      <span className="text-sm text-muted-foreground">v{cli.version}</span>
                    )}
                  </div>
                  <CardDescription>{cli.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">命令:</span>
                    <code className="px-2 py-1 rounded bg-muted font-mono text-xs">
                      {cli.command}
                    </code>
                  </div>

                  {cli.available && cli.name !== 'ollama' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        API 密钥 ({getApiKeyEnvVar(cli.name)})
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKeys[cli.name] ? 'text' : 'password'}
                            value={apiKeys[cli.name] ?? (cli.config?.apiKey as string) ?? ''}
                            onChange={(e) => handleApiKeyChange(cli.name, e.target.value)}
                            placeholder="输入 API 密钥..."
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleShowApiKey(cli.name)}
                          >
                            {showApiKeys[cli.name] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleSaveApiKey(cli.name)}
                          disabled={savedStatus[cli.name]}
                          className="gap-2"
                        >
                          {savedStatus[cli.name] ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              已保存
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              保存
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        可选: 为此 CLI 工具设置 API 密钥。如果未设置，将使用环境变量。
                      </p>
                    </div>
                  )}

                  {cli.name === 'ollama' && cli.available && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">模型</label>
                      <Input
                        value={(cli.config?.model as string) ?? 'llama2'}
                        onChange={(e) => updateCLIConfig(cli.name, { model: e.target.value })}
                        placeholder="输入模型名称 (例如 llama2, mistral)"
                      />
                      <p className="text-xs text-muted-foreground">
                        用于执行的 Ollama 模型。请确保模型已下载。
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* 关于部分 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">关于</h2>
          <Card>
            <CardHeader>
              <CardTitle>AI CLI Hub</CardTitle>
              <CardDescription>版本 1.0.0</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                一个统一的桌面应用程序，用于管理多个 AI CLI 工具，具有对话历史和搜索功能。
              </p>
              <p>使用 Electron、React 和 TypeScript 构建。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
