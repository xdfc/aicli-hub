import Database from 'better-sqlite3'

export function initializeDatabase(db: Database.Database): void {
  // Create history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      cliName TEXT NOT NULL,
      prompt TEXT NOT NULL,
      output TEXT,
      error TEXT,
      executionTime INTEGER,
      timestamp INTEGER NOT NULL,
      tags TEXT,
      workingDirectory TEXT
    )
  `)

  // Add workingDirectory column if it doesn't exist (for migration)
  try {
    db.exec(`ALTER TABLE history ADD COLUMN workingDirectory TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_history_cliName ON history(cliName)
  `)

  // Create CLI config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cli_config (
      cliName TEXT PRIMARY KEY,
      config TEXT NOT NULL
    )
  `)
}

export interface HistoryRecord {
  id: string
  cliName: string
  prompt: string
  output: string | null
  error: string | null
  executionTime: number | null
  timestamp: number
  tags: string | null
  workingDirectory: string | null
}

export interface CLIConfigRecord {
  cliName: string
  config: string
}
