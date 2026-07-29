import { relations } from "drizzle-orm/relations";
import {
  apps,
  appAssets,
  appPagesOnline,
  libraries,
  appFormSubmissions,
  appPages,
  appPagesRevisions,
  appUsers,
  libraryTemplates,
  libraryItems,
  aiLogs,
} from "./schema";

export const appAssetsRelations = relations(appAssets, ({ one }) => ({
  app: one(apps, {
    fields: [appAssets.app],
    references: [apps.id],
  }),
}));

export const appsRelations = relations(apps, ({ many }) => ({
  appAssets: many(appAssets),
  appPagesOnlines: many(appPagesOnline),
  libraries: many(libraries),
  appFormSubmissions: many(appFormSubmissions),
  appPages: many(appPages),
  appPagesRevisions: many(appPagesRevisions),
  appUsers: many(appUsers),
  aiLogs: many(aiLogs),
}));

export const appPagesOnlineRelations = relations(appPagesOnline, ({ one }) => ({
  app: one(apps, {
    fields: [appPagesOnline.app],
    references: [apps.id],
  }),
}));

export const librariesRelations = relations(libraries, ({ one, many }) => ({
  app: one(apps, {
    fields: [libraries.app],
    references: [apps.id],
  }),
  libraryTemplates: many(libraryTemplates),
  libraryItems: many(libraryItems),
}));

export const appFormSubmissionsRelations = relations(appFormSubmissions, ({ one }) => ({
  app: one(apps, {
    fields: [appFormSubmissions.app],
    references: [apps.id],
  }),
}));

export const appPagesRelations = relations(appPages, ({ one, many }) => ({
  app: one(apps, {
    fields: [appPages.app],
    references: [apps.id],
  }),
  appPage: one(appPages, {
    fields: [appPages.parent],
    references: [appPages.id],
    relationName: "appPages_parent_appPages_id",
  }),
  appPages: many(appPages, {
    relationName: "appPages_parent_appPages_id",
  }),
}));

export const appPagesRevisionsRelations = relations(appPagesRevisions, ({ one }) => ({
  app: one(apps, {
    fields: [appPagesRevisions.app],
    references: [apps.id],
  }),
}));

export const appUsersRelations = relations(appUsers, ({ one }) => ({
  app: one(apps, {
    fields: [appUsers.app],
    references: [apps.id],
  }),
}));

export const libraryTemplatesRelations = relations(libraryTemplates, ({ one }) => ({
  library: one(libraries, {
    fields: [libraryTemplates.library],
    references: [libraries.id],
  }),
}));

export const libraryItemsRelations = relations(libraryItems, ({ one }) => ({
  library: one(libraries, {
    fields: [libraryItems.library],
    references: [libraries.id],
  }),
}));

export const aiLogsRelations = relations(aiLogs, ({ one }) => ({
  app: one(apps, {
    fields: [aiLogs.app],
    references: [apps.id],
  }),
}));
