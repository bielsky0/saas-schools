import type { ChaiBlock } from "@chaibuilder/sdk/types";
import { getChaiBuilderTheme } from "@chaibuilder/sdk/utils";
import twAspectRatio from "@tailwindcss/aspect-ratio";
import twContainer from "@tailwindcss/container-queries";
import twForms from "@tailwindcss/forms";
import twTypography from "@tailwindcss/typography";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

export const getBlocksStyles = async (blocks: ChaiBlock[]) => {
  const blocksStr = JSON.stringify(blocks, null, 2).replace(/#styles:([^"]*)/g, (_match, content) => {
    return content
      .replace(/#styles:,/g, "")
      .replace(/#styles:/g, "")
      .replace(/^,/g, "");
  });

  const result = await postcss([
    (tailwindcss as any)({
      darkMode: "class",
      safelist: [],
      theme: {
        // @ts-ignore
        extend: {
          ...getChaiBuilderTheme(),
          keyframes: {
            "accordion-down": {
              from: {
                height: "0",
              },
              to: {
                height: "var(--radix-accordion-content-height)",
              },
            },
            "accordion-up": {
              from: {
                height: "var(--radix-accordion-content-height)",
              },
              to: {
                height: "0",
              },
            },
          },
          animation: {
            "accordion-down": "accordion-down 0.2s ease-out",
            "accordion-up": "accordion-up 0.2s ease-out",
          },
        },
      },
      plugins: [twForms, twTypography, twAspectRatio, twContainer],
      corePlugins: { preflight: false },
      content: [{ raw: `<div>${blocksStr}</div>`, extension: "html" }],
    }),
    autoprefixer(),
  ]).process(`@tailwind components; @tailwind utilities;`, {
    from: undefined,
  });
  return result.css;
};
