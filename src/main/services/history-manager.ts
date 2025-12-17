import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { initializeDatabase, HistoryRecord } from '../database/schema'

export interface HistoryStats {
  totalRecords: number
  totalByCliName: Record<string, number>
}

export class HistoryManager {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    initializeDatabase(this.db)
  }

  addRecord(
    cliName: string,
    prompt: string,
    output: string | null,
    error: string | null,
    executionTime: number | null,
    workingDirectory: string | null = null
  ): HistoryRecord {
    const record: HistoryRecord = {
      id: uuidv4(),
      cliName,
      prompt,
      output,
      error,
      executionTime,
      timestamp: Date.now(),
      tags: null,
      workingDirectory,
    }

    const stmt = this.db.prepare(`
      INSERT INTO history (id, cliName, prompt, output, error, executionTime, timestamp, tags, workingDirectory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      record.id,
      record.cliName,
      record.prompt,
      record.output,
      record.error,
      record.executionTime,
      record.timestamp,
      record.tags,
      record.workingDirectory
    )

    return record
  }

  getRecords(limit = 100, offset = 0): HistoryRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM history
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `)

    return stmt.all(limit, offset) as HistoryRecord[]
  }

  getRecordById(id: string): HistoryRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM history WHERE id = ?
    `)

    return (stmt.get(id) as HistoryRecord) || null
  }

  searchRecords(query: string, cliName?: string): HistoryRecord[] {
    const searchTerm = `%${query}%`

    if (cliName) {
      const stmt = this.db.prepare(`
        SELECT * FROM history
        WHERE (prompt LIKE ? OR output LIKE ?)
        AND cliName = ?
        ORDER BY timestamp DESC
        LIMIT 100
      `)

      return stmt.all(searchTerm, searchTerm, cliName) as HistoryRecord[]
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM history
        WHERE prompt LIKE ? OR output LIKE ?
        ORDER BY timestamp DESC
        LIMIT 100
      `)

      return stmt.all(searchTerm, searchTerm) as HistoryRecord[]
    }
  }

  deleteRecord(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM history WHERE id = ?
    `)

    const result = stmt.run(id)
    return result.changes > 0
  }

  clearAllRecords(): number {
    const stmt = this.db.prepare(`DELETE FROM history`)
    const result = stmt.run()
    return result.changes
  }

  getStats(): HistoryStats {
    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM history`)
    const totalResult = totalStmt.get() as { count: number }

    const byCliStmt = this.db.prepare(`
      SELECT cliName, COUNT(*) as count FROM history GROUP BY cliName
    `)
    const byCliResults = byCliStmt.all() as { cliName: string; count: number }[]

    const totalByCliName: Record<string, number> = {}
    for (const row of byCliResults) {
      totalByCliName[row.cliName] = row.count
    }

    return {
      totalRecords: totalResult.count,
      totalByCliName,
    }
  }

  // CLI Config methods
  getCLIConfig(cliName: string): Record<string, unknown> | null {
    const stmt = this.db.prepare(`
      SELECT config FROM cli_config WHERE cliName = ?
    `)

    const result = stmt.get(cliName) as { config: string } | undefined
    if (result) {
      return JSON.parse(result.config)
    }
    return null
  }

  setCLIConfig(cliName: string, config: Record<string, unknown>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cli_config (cliName, config)
      VALUES (?, ?)
    `)

    stmt.run(cliName, JSON.stringify(config))
  }

  close(): void {
    this.db.close()
  }
}
