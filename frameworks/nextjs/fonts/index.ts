import { registerChaiFont } from "@chaibuilder/sdk/runtime";

export const registerFonts = () => {
  registerChaiFont("Bungee", {
    src: [{ url: "/bungee/Bungee-Regular.woff2", format: "woff2" }],
    fallback: "serif",
  });
  registerChaiFont("Nunito Sans", {
    src: [{ url: "/nunito_sans/nunito-sans-variable.woff2", format: "woff2" }],
    fallback: "sans-serif",
  });
  registerChaiFont("Oswald", {
    src: [{ url: "/oswald/oswald-variable.woff2", format: "woff2" }],
    fallback: "sans-serif",
  });
  registerChaiFont("DM Sans", {
    src: [
      { url: "fonts/dm_sans/dm-sans-regular-vraible.woff2", format: "woff2" },
      { url: "fonts/dm_sans/dm-sans-italic-vraible.woff2", format: "woff2" },
    ],
    fallback: "sans-serif",
  });
};
