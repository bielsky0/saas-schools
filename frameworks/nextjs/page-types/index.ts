import { registerChaiPageType } from "@chaibuilder/sdk/runtime";
import { BlogPageType } from "./blog";

export const registerPageTypes = () => {
  registerChaiPageType(BlogPageType.key, BlogPageType);
};
