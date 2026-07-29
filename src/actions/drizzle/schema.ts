import { pgTable, foreignKey, uuid, text, numeric, timestamp, jsonb, boolean, json, bigint, doublePrecision, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const appPagesMetadataIdSeq = pgSequence("app_pages_metadata_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const webhookEventsIdSeq = pgSequence("webhook_events_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const appAssets = pgTable("app_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	app: uuid(),
	name: text(),
	description: text(),
	url: text(),
	size: text(),
	folderId: text(),
	thumbnailUrl: text(),
	duration: numeric(),
	format: text(),
	width: numeric(),
	height: numeric(),
	createdBy: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: text(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "app_assets_app_fkey"
		}),
]);

export const appPagesOnline = pgTable("app_pages_online", {
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text().notNull(),
	lang: text().default('').notNull(),
	seo: jsonb().default({}),
	app: uuid().notNull(),
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	primaryPage: uuid(),
	blocks: jsonb().default([]),
	currentEditor: text(),
	changes: jsonb(),
	partialBlocks: text(),
	links: text(),
	online: boolean().default(true),
	pageType: text(),
	parent: uuid(),
	lastSaved: timestamp({ withTimezone: true, mode: 'string' }),
	dynamic: boolean().default(false),
	libRefId: uuid(),
	dynamicSlugCustom: text().default(''),
	metadata: jsonb().default({}),
	jsonld: jsonb().default({}),
	globalJsonLds: jsonb().default([]),
	designTokens: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "app_pages_online_app_fkey"
		}),
]);

export const apps = pgTable("apps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text(),
	user: text(),
	settings: jsonb().default({}),
	theme: jsonb().default({}),
	fallbackLang: text().default('en'),
	languages: jsonb().default([]),
	changes: jsonb(),
	deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
	client: uuid(),
	designTokens: jsonb().default({}),
});

export const appsOnline = pgTable("apps_online", {
	id: uuid().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text(),
	user: text(),
	settings: jsonb().default({}),
	theme: jsonb().default({}),
	fallbackLang: text().default('en'),
	languages: jsonb().default([]),
	changes: jsonb(),
	apiKey: text(),
	deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
	client: uuid(),
	designTokens: jsonb().default({}),
});

export const libraries = pgTable("libraries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	name: text(),
	app: uuid(),
	type: text(),
	status: text().default('active').notNull(),
	client: uuid(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "libraries_app_fkey"
		}),
]);

export const appFormSubmissions = pgTable("app_form_submissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	app: uuid(),
	formData: json(),
	additionalData: json(),
	formName: text().default(''),
	pageUrl: text(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "app_form_submissions_app_fkey"
		}),
]);

export const appPages = pgTable("app_pages", {
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text().notNull(),
	lang: text().default('').notNull(),
	seo: jsonb().default({}),
	app: uuid().notNull(),
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	primaryPage: uuid(),
	blocks: jsonb().default([]),
	currentEditor: text(),
	changes: jsonb(),
	online: boolean().default(false),
	parent: uuid(),
	pageType: text(),
	lastSaved: timestamp({ withTimezone: true, mode: 'string' }),
	dynamic: boolean().default(false),
	libRefId: uuid(),
	dynamicSlugCustom: text().default(''),
	metadata: jsonb().default({}),
	jsonld: jsonb().default({}),
	globalJsonLds: jsonb().default([]),
	links: text(),
	partialBlocks: text(),
	designTokens: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "app_pages_app_fkey"
		}),
	foreignKey({
			columns: [table.parent],
			foreignColumns: [table.id],
			name: "app_pages_parent_fkey"
		}),
]);

export const appPagesRevisions = pgTable("app_pages_revisions", {
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	slug: text().notNull(),
	lang: text().default('').notNull(),
	seo: jsonb().default({}),
	app: uuid().notNull(),
	id: uuid().notNull(),
	name: text().notNull(),
	primaryPage: uuid(),
	blocks: jsonb().default([]),
	currentEditor: text(),
	changes: jsonb(),
	partialBlocks: text(),
	links: text(),
	online: boolean().default(true),
	pageType: text(),
	parent: uuid(),
	lastSaved: timestamp({ withTimezone: true, mode: 'string' }),
	dynamic: boolean().default(false),
	uid: uuid().defaultRandom().primaryKey().notNull(),
	type: text(),
	libRefId: uuid(),
	dynamicSlugCustom: text().default(''),
	metadata: jsonb().default({}),
	jsonld: jsonb().default({}),
	globalJsonLds: jsonb().default([]),
	designTokens: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "app_pages_revisions_app_fkey"
		}),
]);

export const appUsers = pgTable("app_users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	user: text(),
	app: uuid(),
	role: text(),
	permissions: jsonb(),
	status: text().default('active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "app_users_app_fkey"
		}),
]);

export const libraryTemplates = pgTable("library_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	user: text(),
	name: text(),
	description: text(),
	pageId: uuid(),
	pageType: text(),
	library: uuid(),
	preview: text(),
}, (table) => [
	foreignKey({
			columns: [table.library],
			foreignColumns: [libraries.id],
			name: "library_templates_library_fkey"
		}),
]);

export const libraryItems = pgTable("library_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	library: uuid(),
	name: text(),
	description: text(),
	blocks: jsonb().default([]),
	preview: text(),
	group: text().default('general'),
	user: text(),
	html: text(),
}, (table) => [
	foreignKey({
			columns: [table.library],
			foreignColumns: [libraries.id],
			name: "library_items_library_fkey"
		}),
]);

export const aiLogs = pgTable("ai_logs", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "ai_logs_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	model: text(),
	totalDuration: numeric(),
	error: text(),
	totalTokens: numeric(),
	tokenUsage: jsonb(),
	user: text(),
	client: uuid().defaultRandom(),
	cost: doublePrecision().default(sql`'0'`),
	prompt: text(),
	app: uuid(),
}, (table) => [
	foreignKey({
			columns: [table.app],
			foreignColumns: [apps.id],
			name: "ai_logs_app_fkey"
		}),
]);
