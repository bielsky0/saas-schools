import type { Block } from "payload";

export const contactFormBlock: Block = {
  slug: "contact_form",
  labels: { singular: "Contact Form", plural: "Contact Forms" },
  admin: { group: "Sekcje" },
  fields: [
    {
      name: "title",
      type: "text",
    },
    {
      name: "recipientEmail",
      type: "email",
    },
    {
      name: "showPhone",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "showMessage",
      type: "checkbox",
      defaultValue: true,
    },
    {
      name: "privacyNote",
      type: "textarea",
      admin: {
        description:
          'Optional — add a link to your privacy policy, e.g. "We process your data per our privacy policy"',
      },
    },
  ],
};
