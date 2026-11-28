import pg from "pg";

/** Тонкая обёртка над пулом PostgreSQL: запрос, первая строка, транзакция. */
export interface Queryable {
  query<Row extends pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<pg.QueryResult<Row>>;
}

export class Database {
  readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 10 });
  }

  async rows<Row extends pg.QueryResultRow>(sql: string, params: unknown[] = [], client: Queryable = this.pool): Promise<Row[]> {
    return (await client.query<Row>(sql, params)).rows;
  }

  async one<Row extends pg.QueryResultRow>(sql: string, params: unknown[] = [], client: Queryable = this.pool): Promise<Row | null> {
    return (await client.query<Row>(sql, params)).rows[0] ?? null;
  }

  /** Выполняет функцию в транзакции; при ошибке всё откатывается. */
  async transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
