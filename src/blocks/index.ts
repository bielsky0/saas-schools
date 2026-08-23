import { registerChaiBlock, registerBlockPickerCategories, registerSectionCatalogEntries } from "@chaibuilder/sdk/runtime";

import { Component as GroupTypeCard, Config as GroupTypeCardConfig } from "./GroupTypeCard/config";
import { Component as UpcomingEvents, Config as UpcomingEventsConfig } from "./UpcomingEvents/config";
import { Component as BookingButton, Config as BookingButtonConfig } from "./BookingButton/config";
import { Component as InstructorCard, Config as InstructorCardConfig } from "./InstructorCard/config";

import { Component as BlogPostTitle, Config as BlogPostTitleConfig } from "./blog/BlogPostTitle/config";
import { Component as BlogPostContent, Config as BlogPostContentConfig } from "./blog/BlogPostContent/config";
import { Component as BlogPostImage, Config as BlogPostImageConfig } from "./blog/BlogPostImage/config";
import { Component as BlogPostAuthor, Config as BlogPostAuthorConfig } from "./blog/BlogPostAuthor/config";
import { Component as BlogPostDate, Config as BlogPostDateConfig } from "./blog/BlogPostDate/config";
import { Component as BlogPostExcerpt, Config as BlogPostExcerptConfig } from "./blog/BlogPostExcerpt/config";
import { Component as BlogPostTags, Config as BlogPostTagsConfig } from "./blog/BlogPostTags/config";
import { Component as BlogPostList, Config as BlogPostListConfig } from "./blog/BlogPostList/config";
import { Component as BlogPagination, Config as BlogPaginationConfig } from "./blog/BlogPagination/config";
import { langlionSectionCatalogEntries } from "@/lib/section-catalog";

registerChaiBlock(GroupTypeCard, GroupTypeCardConfig);
registerChaiBlock(UpcomingEvents, UpcomingEventsConfig);
registerChaiBlock(BookingButton, BookingButtonConfig);
registerChaiBlock(InstructorCard, InstructorCardConfig);
registerChaiBlock(BlogPostTitle, BlogPostTitleConfig);
registerChaiBlock(BlogPostContent, BlogPostContentConfig);
registerChaiBlock(BlogPostImage, BlogPostImageConfig);
registerChaiBlock(BlogPostAuthor, BlogPostAuthorConfig);
registerChaiBlock(BlogPostDate, BlogPostDateConfig);
registerChaiBlock(BlogPostExcerpt, BlogPostExcerptConfig);
registerChaiBlock(BlogPostTags, BlogPostTagsConfig);
registerChaiBlock(BlogPostList, BlogPostListConfig);
registerChaiBlock(BlogPagination, BlogPaginationConfig);

registerSectionCatalogEntries(langlionSectionCatalogEntries);

registerBlockPickerCategories([
  ["GroupTypeCard", "Produkt"],
  ["UpcomingEvents", "Produkt"],
  ["BookingButton", "Formularze"],
  ["InstructorCard", "Podstawowe"],
  ["BlogPostTitle", "Podstawowe"],
  ["BlogPostContent", "Podstawowe"],
  ["BlogPostImage", "Podstawowe"],
  ["BlogPostAuthor", "Podstawowe"],
  ["BlogPostDate", "Podstawowe"],
  ["BlogPostExcerpt", "Podstawowe"],
  ["BlogPostTags", "Podstawowe"],
  ["BlogPostList", "Podstawowe"],
  ["BlogPagination", "Podstawowe"],
]);
