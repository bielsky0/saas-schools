import { getChaiBuilderTailwindConfig } from "@chaibuilder/sdk/utils";

export default getChaiBuilderTailwindConfig({
  content: ["./node_modules/@chaibuilder/sdk/dist/**/*.{js,cjs}"],
});
