export const EXTERNAL_DATA = {
  vehicle: {
    title: "query_params",
    description: "Chai Builder is a tool that allows you to build your own website visually.",
    price: "$2000",
    image: "https://picsum.photos/400/200",
    link: "https://www.google.com",
    features: [
      {
        name: "Visual Editor",
        description: "Build your website visually with a drag and drop interface.",
      },
      {
        name: "Responsive Design",
        description: "Your website will look great on all devices.",
      },
      {
        name: "SEO Optimized",
        description: "Your website will be optimized for search engines.",
      },
    ],
    reviews: [
      {
        name: "Lorem Ipsum is a good astrologer",
        image: "https://picsum.photos/400/200",
        rating: 4.5,
        comment: "This is a comment",
      },
      {
        name: "Pippo is a good driver",
        image: "https://picsum.photos/500/300",
        rating: 4,
        comment: "This is an another comment",
      },
    ],
  },
  global: {
    siteName: "My Site",
    twitterHandle: "@my-twitter-handle",
    description: "This is a description of my page",
  },
};

export type ExternalDataType = typeof EXTERNAL_DATA;
