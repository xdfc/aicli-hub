import { useState, useEffect } from 'react'
import { useAppStore } from '../store/app-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { FolderOpen } from 'lucide-react'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NewConversationDialog({
  open,
  onOpenChange,
}: NewConversationDialogProps) {
  const {
    clis,
    selectedCLI,
    selectCLI,
    workingDirectory,
    setWorkingDirectory,
    selectWorkingDirectory,
    selectHistory,
    clearOutput,
  } = useAppStore()

  const [localCLI, setLocalCLI] = useState(selectedCLI || '')
  const [localDir, setLocalDir] = useState(workingDirectory || '')

  const availableCLIs = clis.filter((cli) => cli.available)

  // 同步外部状态到本地
  useEffect(() => {
    if (open) {
      setLocalCLI(selectedCLI || (availableCLIs.length > 0 ? availableCLIs[0].name : ''))
      setLocalDir(workingDirectory || '')
    }
  }, [open, selectedCLI, workingDirectory, availableCLIs])

  const handleSelectDirectory = async () => {
    await selectWorkingDirectory()
    // 获取更新后的目录
    const { workingDirectory: newDir } = useAppStore.getState()
    if (newDir) {
      setLocalDir(newDir)
    }
  }

  const handleStart = () => {
    // 应用选择
    if (localCLI) {
      selectCLI(localCLI)
    }
    setWorkingDirectory(localDir || null)
    // 清除历史选择和输出
    selectHistory(null)
    clearOutput()
    // 关闭弹窗
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新建对话</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CLI 工具选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CLI 工具选择</label>
            <Select value={localCLI} onValueChange={setLocalCLI}>
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
                    <div className="flex flex-col">
                      <span>{cli.displayName}</span>
                      {cli.description && (
                        <span className="text-xs text-muted-foreground">
                          {cli.description}
                        </span>
                      )}
                    </div>
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

          {/* 工作目录选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">工作目录选择</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSelectDirectory}
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                选择目录
              </Button>
              {localDir && (
                <span className="text-sm text-muted-foreground font-mono truncate flex-1">
                  {localDir}
                </span>
              )}
            </div>
            {!localDir && (
              <p className="text-xs text-muted-foreground">
                可选：选择项目工作目录以获得更好的上下文
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleStart} disabled={!localCLI}>
            开始
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
