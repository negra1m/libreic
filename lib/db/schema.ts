import {
  pgTable, uuid, text, smallint, bigint, timestamp,
  boolean, integer, index, primaryKey, pgEnum, type AnyPgColumn
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['free', 'pro', 'creator'])
export const sourceTypeEnum = pgEnum('source_type', [
  'link', 'youtube', 'reel', 'pdf', 'audio', 'image', 'note', 'internal'
])
export const statusEnum = pgEnum('status', [
  'saved', 'pending', 'seen', 'summarized', 'applied', 'archived'
])
export const relationTypeEnum = pgEnum('relation_type', [
  'complementa', 'aprofunda', 'originou', 'contradiz', 'generaliza'
])

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:                uuid('id').primaryKey().defaultRandom(),
  email:             text('email').notNull().unique(),
  name:              text('name').notNull(),
  image:             text('image'),
  emailVerified:     timestamp('email_verified', { mode: 'date' }), // requerido pelo NextAuth
  password:          text('password'), // null se OAuth
  plan:              planEnum('plan').notNull().default('free'),
  storageLimitBytes: bigint('storage_limit_bytes', { mode: 'number' }).notNull().default(524288000),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
})

// NextAuth tables
export const accounts = pgTable('accounts', {
  userId:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}))

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires').notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token:      text('token').notNull(),
  expires:    timestamp('expires').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}))

// ─── Themes ───────────────────────────────────────────────────────────────────
export const themes = pgTable('themes', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId:  uuid('parent_id'),
  name:      text('name').notNull(),
  icon:      text('icon'),
  color:     text('color').default('#6366f1'),
  position:  integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_themes_user').on(t.userId, t.parentId),
}))

// ─── Blocks ───────────────────────────────────────────────────────────────────
export const blocks = pgTable('blocks', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:          text('title').notNull(),
  sourceUrl:      text('source_url'),
  sourceType:     sourceTypeEnum('source_type').notNull(),
  thumbnailUrl:   text('thumbnail_url'),
  bodyText:       text('body_text'),
  personalNote:   text('personal_note'),
  summary:        text('summary'),
  mainInsight:    text('main_insight'),
  actionItem:     text('action_item'),
  importance:     smallint('importance').notNull().default(3),
  status:         statusEnum('status').notNull().default('saved'),
  filePath:       text('file_path'),
  fileName:       text('file_name'),
  fileSizeBytes:  bigint('file_size_bytes', { mode: 'number' }),
  duration:       integer('duration'), // segundos, para vídeo/áudio
  reviewDueAt:    timestamp('review_due_at'),
  lastReviewedAt: timestamp('last_reviewed_at'),
  reviewCount:    integer('review_count').notNull().default(0),
  isPublic:       boolean('is_public').notNull().default(false),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userStatusIdx:  index('idx_blocks_user_status').on(t.userId, t.status),
  userTypeIdx:    index('idx_blocks_user_type').on(t.userId, t.sourceType),
  userCreatedIdx: index('idx_blocks_user_created').on(t.userId, t.createdAt),
  reviewIdx:      index('idx_blocks_review').on(t.userId, t.reviewDueAt),
}))

// ─── Block ↔ Theme (M:M) ─────────────────────────────────────────────────────
export const blockThemes = pgTable('block_themes', {
  blockId:  uuid('block_id').notNull().references(() => blocks.id, { onDelete: 'cascade' }),
  themeId:  uuid('theme_id').notNull().references(() => themes.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk:       primaryKey({ columns: [t.blockId, t.themeId] }),
  themeIdx: index('idx_block_themes_theme').on(t.themeId),
}))

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tags = pgTable('tags', {
  id:     uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:   text('name').notNull(),
}, (t) => ({
  uniqueUserTag: index('idx_tags_user_name').on(t.userId, t.name),
}))

export const blockTags = pgTable('block_tags', {
  blockId: uuid('block_id').notNull().references(() => blocks.id, { onDelete: 'cascade' }),
  tagId:   uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk:      primaryKey({ columns: [t.blockId, t.tagId] }),
  tagIdx:  index('idx_block_tags_tag').on(t.tagId),
}))

// ─── Block Connections ────────────────────────────────────────────────────────
export const blockConnections = pgTable('block_connections', {
  id:           uuid('id').primaryKey().defaultRandom(),
  sourceId:     uuid('source_id').notNull().references(() => blocks.id, { onDelete: 'cascade' }),
  targetId:     uuid('target_id').notNull().references(() => blocks.id, { onDelete: 'cascade' }),
  relationType: relationTypeEnum('relation_type').notNull().default('complementa'),
  note:         text('note'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  sourceIdx: index('idx_connections_source').on(t.sourceId),
  targetIdx: index('idx_connections_target').on(t.targetId),
}))

// ─── Collections ──────────────────────────────────────────────────────────────
export const collections = pgTable('collections', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  isPublic:    boolean('is_public').notNull().default(false),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const collectionBlocks = pgTable('collection_blocks', {
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  blockId:      uuid('block_id').notNull().references(() => blocks.id, { onDelete: 'cascade' }),
  position:     integer('position').notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.collectionId, t.blockId] }),
}))

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  themes:      many(themes),
  blocks:      many(blocks),
  tags:        many(tags),
  collections: many(collections),
}))

export const themesRelations = relations(themes, ({ one, many }) => ({
  user:        one(users, { fields: [themes.userId], references: [users.id] }),
  parent:      one(themes, { fields: [themes.parentId], references: [themes.id], relationName: 'parent' }),
  children:    many(themes, { relationName: 'parent' }),
  blockThemes: many(blockThemes),
}))

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  user:             one(users, { fields: [blocks.userId], references: [users.id] }),
  blockThemes:      many(blockThemes),
  blockTags:        many(blockTags),
  sourceConnections: many(blockConnections, { relationName: 'source' }),
  targetConnections: many(blockConnections, { relationName: 'target' }),
  collectionBlocks: many(collectionBlocks),
}))

export const blockThemesRelations = relations(blockThemes, ({ one }) => ({
  block: one(blocks, { fields: [blockThemes.blockId], references: [blocks.id] }),
  theme: one(themes, { fields: [blockThemes.themeId], references: [themes.id] }),
}))

export const blockTagsRelations = relations(blockTags, ({ one }) => ({
  block: one(blocks, { fields: [blockTags.blockId], references: [blocks.id] }),
  tag:   one(tags, { fields: [blockTags.tagId], references: [tags.id] }),
}))

export const blockConnectionsRelations = relations(blockConnections, ({ one }) => ({
  source: one(blocks, { fields: [blockConnections.sourceId], references: [blocks.id], relationName: 'source' }),
  target: one(blocks, { fields: [blockConnections.targetId], references: [blocks.id], relationName: 'target' }),
}))

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user:            one(users, { fields: [collections.userId], references: [users.id] }),
  collectionBlocks: many(collectionBlocks),
}))

export const collectionBlocksRelations = relations(collectionBlocks, ({ one }) => ({
  collection: one(collections, { fields: [collectionBlocks.collectionId], references: [collections.id] }),
  block:      one(blocks, { fields: [collectionBlocks.blockId], references: [blocks.id] }),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user:      one(users, { fields: [tags.userId], references: [users.id] }),
  blockTags: many(blockTags),
}))
