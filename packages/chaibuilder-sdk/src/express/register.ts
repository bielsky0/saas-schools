import { registerChaiPageType } from "~/runtime/register-page-type";

registerChaiPageType("listing", {
  name: "Listings",
  dynamicSegments: "(?:/[\\d]+)?",
});

registerChaiPageType("blogue", {
  name: "Nouvelles",
  dynamicSegments: "^(/[\\w-]*)?$",
  getDynamicPages: async () => {
    return [
      { id: "blogue1", slug: "/blogue1", name: "Nouvelles1 fr", lang: "fr" },
      { id: "blogue2", slug: "/blogue2", name: "Nouvelles2 fr", lang: "fr" },
      { id: "blogue2", slug: "/blogue2", name: "Nouvelles2 en", lang: "en", primaryPage: "blogue2" },
      { id: "blogue3", slug: "/blogue3", name: "Nouvelles3 fr", lang: "fr" },
      { id: "blogue3", slug: "/blogue3", name: "Nouvelles3 en", lang: "en", primaryPage: "blogue3" },
    ];
  },
  defaultSeo: () => ({
    fr: {
      title: "{{global.name}}",
      description: "{{global.description}}",
    },
    en: {
      title: "{{global.name}}",
      description: "{{global.description}}",
    },
  }),
  defaultJSONLD: () => ({
    fr: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "{{global.name}}",
      description: "{{global.description}}",
      url: "https://chaibuilder.com/blogue",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://chaibuilder.com/blogue?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    en: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "{{global.name}}",
      description: "{{global.description}}",
      url: "https://chaibuilder.com/blogue",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://chaibuilder.com/blogue?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  }),
});
