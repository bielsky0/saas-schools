-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

CREATE TABLE "app_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" uuid,
	"name" text,
	"description" text,
	"url" text,
	"size" text,
	"folderId" text,
	"thumbnailUrl" text,
	"duration" numeric,
	"format" text,
	"width" numeric,
	"height" numeric,
	"createdBy" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_pages_online" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"primaryPage" uuid,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"currentEditor" text,
	"changes" jsonb,
	"partialBlocks" text,
	"links" text,
	"online" boolean DEFAULT true,
	"pageType" text,
	"parent" uuid,
	"lastSaved" timestamp with time zone,
	"dynamic" boolean DEFAULT false,
	"libRefId" uuid,
	"dynamicSlugCustom" text DEFAULT '',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"jsonld" jsonb DEFAULT '{}'::jsonb,
	"globalJsonLds" jsonb DEFAULT '[]'::jsonb,
	"designTokens" jsonb
);
--> statement-breakpoint
ALTER TABLE "app_pages_online" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"user" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"theme" jsonb DEFAULT '{}'::jsonb,
	"fallbackLang" text DEFAULT 'en',
	"languages" jsonb DEFAULT '[]'::jsonb,
	"changes" jsonb,
	"deletedAt" timestamp with time zone,
	"client" uuid,
	"designTokens" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "apps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "apps_online" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"user" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"theme" jsonb DEFAULT '{}'::jsonb,
	"fallbackLang" text DEFAULT 'en',
	"languages" jsonb DEFAULT '[]'::jsonb,
	"changes" jsonb,
	"apiKey" text,
	"deletedAt" timestamp with time zone,
	"client" uuid,
	"designTokens" jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE "apps_online" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "libraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"app" uuid,
	"type" text,
	"status" text DEFAULT 'active' NOT NULL,
	"client" uuid
);
--> statement-breakpoint
ALTER TABLE "libraries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"app" uuid,
	"formData" json,
	"additionalData" json,
	"formName" text DEFAULT '',
	"pageUrl" text
);
--> statement-breakpoint
ALTER TABLE "app_form_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_pages" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"primaryPage" uuid,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"currentEditor" text,
	"changes" jsonb,
	"online" boolean DEFAULT false,
	"parent" uuid,
	"pageType" text,
	"lastSaved" timestamp with time zone,
	"dynamic" boolean DEFAULT false,
	"libRefId" uuid,
	"dynamicSlugCustom" text DEFAULT '',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"jsonld" jsonb DEFAULT '{}'::jsonb,
	"globalJsonLds" jsonb DEFAULT '[]'::jsonb,
	"links" text,
	"partialBlocks" text,
	"designTokens" jsonb
);
--> statement-breakpoint
ALTER TABLE "app_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_pages_revisions" (
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"id" uuid NOT NULL,
	"name" text NOT NULL,
	"primaryPage" uuid,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"currentEditor" text,
	"changes" jsonb,
	"partialBlocks" text,
	"links" text,
	"online" boolean DEFAULT true,
	"pageType" text,
	"parent" uuid,
	"lastSaved" timestamp with time zone,
	"dynamic" boolean DEFAULT false,
	"uid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text,
	"libRefId" uuid,
	"dynamicSlugCustom" text DEFAULT '',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"jsonld" jsonb DEFAULT '{}'::jsonb,
	"globalJsonLds" jsonb DEFAULT '[]'::jsonb,
	"designTokens" jsonb
);
ALTER TABLE "app_pages_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"user" text,
	"app" uuid,
	"role" text,
	"permissions" jsonb,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "library_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"user" text,
	"name" text,
	"description" text,
	"pageId" uuid,
	"pageType" text,
	"library" uuid,
	"preview" text
);
--> statement-breakpoint
ALTER TABLE "library_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"library" uuid,
	"name" text,
	"description" text,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"preview" text,
	"group" text DEFAULT 'general',
	"user" text,
	"html" text
);
--> statement-breakpoint
ALTER TABLE "library_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_logs" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "ai_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text,
	"totalDuration" numeric,
	"error" text,
	"totalTokens" numeric,
	"tokenUsage" jsonb,
	"user" text,
	"client" uuid DEFAULT gen_random_uuid(),
	"cost" double precision DEFAULT '0',
	"prompt" text,
	"app" uuid
);
--> statement-breakpoint
ALTER TABLE "ai_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_assets" ADD CONSTRAINT "app_assets_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages_online" ADD CONSTRAINT "app_pages_online_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_form_submissions" ADD CONSTRAINT "app_form_submissions_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages" ADD CONSTRAINT "app_pages_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages" ADD CONSTRAINT "app_pages_parent_fkey" FOREIGN KEY ("parent") REFERENCES "public"."app_pages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages_revisions" ADD CONSTRAINT "app_pages_revisions_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_templates" ADD CONSTRAINT "library_templates_library_fkey" FOREIGN KEY ("library") REFERENCES "public"."libraries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_library_fkey" FOREIGN KEY ("library") REFERENCES "public"."libraries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_app_fkey" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;
