import { ChaiPageProps, ChaiPageType } from "@chaibuilder/sdk/types";

export const BlogPageType: ChaiPageType = {
  key: "blog",
  name: "Blog",
  dynamicSegments: "/[a-z0-9]+(?:-[a-z0-9]+)*$", // regex for slug. starts with / and should contain only lowercase letters, numbers and hyphens
  dynamicSlug: "{{slug}}",
  dataProvider: async (args: { lang: string; draft: boolean; inBuilder: boolean; pageProps: ChaiPageProps }) => {
    const slug = args.inBuilder ? "/hard-coded-slug" : args.pageProps.slug;
    //TODO: Implement blog fetch here. Any information returned here can be used for data binding eg. {{slug}},{{title}},{{description}} etc
    return {
      blog: {
        url: `/${slug}`,
        title: "Hard Coded Title",
        description: "Hard Coded Description",
        image: "https://picsum.photos/seed/picsum/200/300",
        datePublished: new Date().toISOString(),
      },
    };
  },
  // Default SEO and JSON-LD for blog pages on creation
  defaultSeo: () => ({
    title: "{{blog.title}}",
    description: "{{blog.description}}",
  }),
  defaultJSONLD: () => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "{{blog.title}}",
    description: "{{blog.description}}",
    image: "{{blog.image}}",
    url: "{{blog.url}}",
    author: {
      "@type": "Organization",
      name: "{{global.name}}",
      url: "{{blog.url}}",
    },
    publisher: {
      "@type": "Organization",
      name: "{{global.name}}",
      url: "{{blog.url}}",
    },
    datePublished: "{{blog.datePublished}}",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "{{blog.url}}",
    },
  }),
};
