declare module "node:sqlite" {
  type SqlValue = string | number | bigint | null | Uint8Array

  export class DatabaseSync {
    constructor(path: string)
    exec(sql: string): void
    prepare(sql: string): StatementSync
  }

  export interface StatementSync {
    run(...params: SqlValue[]): { changes: number }
    get(...params: SqlValue[]): Record<string, SqlValue> | undefined
    all(...params: SqlValue[]): Array<Record<string, SqlValue>>
  }
}
