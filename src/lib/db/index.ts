import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";
import { appConfig, dbPoolSize } from "@/lib/config";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
  db?: Db;
};

function createDb(): Db {
  if (!appConfig.databaseUrl) {
    throw new Error("DATABASE_URL이 설정되지 않았습니다.");
  }
  const max = dbPoolSize();
  const sql =
    globalForDb.sql ??
    postgres(appConfig.databaseUrl, {
      max,
      // Vercel 등 서버리스: prepared statement 재사용 이슈 완화
      prepare: max > 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.sql = sql;
  }
  return drizzle(sql, { schema });
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!globalForDb.db) {
      globalForDb.db = createDb();
    }
    return Reflect.get(globalForDb.db, prop, receiver);
  },
});
