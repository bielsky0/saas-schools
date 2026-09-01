import "next-intl";

declare module "next-intl" {
  interface IntlMessages {
    credits: {
      productTemplateCreated: string;
      productTemplateUpdated: string;
      productTemplateDeleted: string;
      errors: {
        nameTaken: string;
      };
    };
  }
}