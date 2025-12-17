import { useEffect, useState } from 'react'
import { useAppStore, HistoryRecord } from '../store/app-store'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { ScrollArea } from '../components/ui/scroll-area'
import { Separator } from '../components/ui/separator'
import { Search, Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function SearchPage() {
  const [selectedResult, setSelectedResult] = useState<HistoryRecord | null>(null)
  const {
    clis,
    searchQuery,
    searchResults,
    searchCLIFilter,
    setSearchQuery,
    setSearchCLIFilter,
    performSearch,
  } = useAppStore()

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch()
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery, searchCLIFilter, performSearch])

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getCLIDisplayName = (cliName: string): string => {
    const cli = clis.find((c) => c.name === cliName)
    return cli?.displayName || cliName
  }

  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query.trim()) return <>{text}</>

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    )
  }

  return (
    <div className="flex h-full">
      {/* Search Panel */}
      <div className="flex w-96 flex-col border-r">
        <div className="p-4 space-y-4 border-b">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts and outputs..."
              className="pl-10"
            />
          </div>

          {/* CLI Filter */}
          <Select
            value={searchCLIFilter || 'all'}
            onValueChange={(value) => setSearchCLIFilter(value === 'all' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by CLI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CLI Tools</SelectItem>
              {clis.map((cli) => (
                <SelectItem key={cli.name} value={cli.name}>
                  {cli.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Results Count */}
          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>

        {/* Search Results */}
        <ScrollArea className="flex-1">
          {!searchQuery ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Enter a search term to find records
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results found
            </div>
          ) : (
            <div className="divide-y">
              {searchResults.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setSelectedResult(record)}
                  className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedResult?.id === record.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
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
                      <p className="text-sm line-clamp-2">
                        {highlightMatch(record.prompt, searchQuery)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(record.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedResult ? (
          <SearchResultDetail
            record={selectedResult}
            cliDisplayName={getCLIDisplayName(selectedResult.cliName)}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a result to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SearchResultDetailProps {
  record: HistoryRecord
  cliDisplayName: string
  searchQuery: string
}

function SearchResultDetail({ record, cliDisplayName, searchQuery }: SearchResultDetailProps) {
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatTime = (ms: number | null): string => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query.trim() || !text) return <>{text}</>

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    )
  }

  return (
    <>
      <div className="p-4 border-b">
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
              {highlightMatch(record.prompt, searchQuery)}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">Output</h3>
            <div className="p-3 rounded-md bg-muted font-mono text-sm whitespace-pre-wrap break-words">
              {record.output ? (
                highlightMatch(record.output, searchQuery)
              ) : (
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
