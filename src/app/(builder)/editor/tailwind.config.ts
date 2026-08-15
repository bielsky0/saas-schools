import { getChaiBuilderTailwindConfig } from "@chaibuilder/sdk/utils";

import path from "node:path";
import { getChaiBuilderTailwindConfig } from "@chaibuilder/sdk/utils";

export default getChaiBuilderTailwindConfig({
  content: [
    path.resolve(__dirname, "../../../../packages/chaibuilder-sdk/dist/**/*.{js,cjs}"),
  ],
});
