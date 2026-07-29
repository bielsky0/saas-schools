import { PERMISSIONS as SDK_PERMISSIONS } from "~/core/main";

export const PAGES_PERMISSIONS = {
  ...SDK_PERMISSIONS,
  //pages
  ADD_PAGE: "add_page",
  EDIT_PAGE: "edit_page",
  EDIT_SLUG: "edit_slug",
  DELETE_PAGE: "delete_page",
  CHANGE_PAGE_TYPE: "change_page_type",
  PUBLISH_PAGE: "publish_page",
  UNPUBLISH_PAGE: "unpublish_page",
  MARK_AS_TEMPLATE: "mark_as_template",
  UNMARK_AS_TEMPLATE: "unmark_as_template",

  //PARTIALS
  ADD_PARTIAL: "add_partial",
  EDIT_PARTIAL: "edit_partial",
  DELETE_PARTIAL: "delete_partial",
  PUBLISH_PARTIAL: "publish_partial",
  UNPUBLISH_PARTIAL: "unpublish_partial",

  //SEO
  EDIT_SEO: "edit_seo",

  // revisions
  RESTORE_REVISION: "restore_revision",
  DELETE_REVISION: "delete_revision",

  //theme
  PUBLISH_THEME: "publish_theme",
  EDIT_SETTINGS: "edit_settings",

  // library and templates
  ADD_LIBRARY_BLOCK: "create_library_block",
  ADD_LIBRARY_TEMPLATE: "add_library_template",
  EDIT_LIBRARY_BLOCK: "edit_library_block",
  EDIT_LIBRARY_TEMPLATE: "edit_library_template",
  DELETE_LIBRARY_BLOCK: "delete_library_block",
  DELETE_LIBRARY_TEMPLATE: "delete_library_template",

  //media
  ADD_MEDIA: "add_media",
  EDIT_MEDIA: "edit_media",
  DELETE_MEDIA: "delete_media",
};
