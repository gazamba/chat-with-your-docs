import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  vector,
  index,
} from "drizzle-orm/pg-core";

/** Embedding width for OpenAI `text-embedding-3-small`. */
export const EMBEDDING_DIMENSIONS = 1536;

export const documentStatus = pgEnum("document_status", [
  "processing",
  "ready",
  "error",
]);

export const documents = pgTable("document", {
  id: uuid("id").defaultRandom().primaryKey(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  charCount: integer("char_count").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(0),
  status: documentStatus("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chunks = pgTable(
  "chunk",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", {
      dimensions: EMBEDDING_DIMENSIONS,
    }).notNull(),
  },
  (table) => [
    // Approximate nearest-neighbour search over cosine distance.
    index("chunk_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("chunk_document_id_idx").on(table.documentId),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
