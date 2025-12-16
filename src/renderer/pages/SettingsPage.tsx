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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your CLI tools and configuration
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh CLIs
          </Button>
        </div>

        <Separator />

        {/* CLI Tools Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">CLI Tools</h2>
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
                          Available
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" />
                          Not Found
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
                    <span className="text-muted-foreground">Command:</span>
                    <code className="px-2 py-1 rounded bg-muted font-mono text-xs">
                      {cli.command}
                    </code>
                  </div>

                  {cli.available && cli.name !== 'ollama' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        API Key ({getApiKeyEnvVar(cli.name)})
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKeys[cli.name] ? 'text' : 'password'}
                            value={apiKeys[cli.name] ?? (cli.config?.apiKey as string) ?? ''}
                            onChange={(e) => handleApiKeyChange(cli.name, e.target.value)}
                            placeholder="Enter API key..."
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
                              Saved
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Optional: Set the API key for this CLI tool. If not set, the tool will use
                        the environment variable.
                      </p>
                    </div>
                  )}

                  {cli.name === 'ollama' && cli.available && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Model</label>
                      <Input
                        value={(cli.config?.model as string) ?? 'llama2'}
                        onChange={(e) => updateCLIConfig(cli.name, { model: e.target.value })}
                        placeholder="Enter model name (e.g., llama2, mistral)"
                      />
                      <p className="text-xs text-muted-foreground">
                        The Ollama model to use for execution. Make sure the model is pulled first.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* About Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <Card>
            <CardHeader>
              <CardTitle>AI CLI Hub</CardTitle>
              <CardDescription>Version 1.0.0</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                A unified desktop application for managing multiple AI CLI tools with conversation
                history and search capabilities.
              </p>
              <p>Built with Electron, React, and TypeScript.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
