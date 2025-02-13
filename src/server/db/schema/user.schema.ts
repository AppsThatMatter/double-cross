import { sql } from "drizzle-orm";
import { boolean, check, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(), // easier temp menagement
    username: varchar("username", { length: 256 }).notNull(),
    email: varchar("email", { length: 256 }),
    isTemp: boolean("is_temp").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "check_valid",
      sql`${table.isTemp} = TRUE OR ${table.email} IS NOT NULL`,
    ),
  ],
);
