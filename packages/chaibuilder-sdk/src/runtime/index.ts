import { each, get, intersection, isEmpty, keys, omit } from "lodash-es";
import { STYLES_KEY } from "~/core/constants/STRINGS.ts";
import { ChaiBlockPropsSchema, ChaiBlockRJSFSchemas, ChaiBlockUiSchema } from "~/types/common.ts";

export const registerChaiBlockSchema = (blockSchema: ChaiBlockPropsSchema): ChaiBlockRJSFSchemas => {
  console.warn("registerChaiBlockSchema is deprecated, use registerChaiBlockProps instead");
  return registerChaiBlockProps(blockSchema);
};

export const registerChaiBlockProps = (blockSchema: ChaiBlockPropsSchema): ChaiBlockRJSFSchemas => {
  const reservedProps = ["_type", "_id", "_parent", "_bindings", "_name"];
  const runtimeProps = ["$loading", "blockProps", "inBuilder", "lang", "draft", "pageProps", "pageData", "children"];
  const propsKeys = keys(blockSchema.properties);

  if (intersection(propsKeys, reservedProps).length > 0) {
    throw new Error(`Reserved props are not allowed: ${intersection(propsKeys, reservedProps).join(", ")}`);
  }

  if (intersection(propsKeys, runtimeProps).length > 0) {
    throw new Error(`Runtime props are not allowed in schema: ${intersection(propsKeys, runtimeProps).join(", ")}`);
  }

  const schema = get(blockSchema, "properties", {}) as Record<string, ChaiBlockPropsSchema>;
  const uiSchema = {} as Record<string, ChaiBlockUiSchema>;
  each(schema, (prop, key) => {
    if (!isEmpty(prop.ui)) {
      uiSchema[key] = { ...prop.ui };
      delete schema[key].ui;
    }
  });
  return {
    schema: isEmpty(schema) ? {} : { ...omit(blockSchema, ["ui"]) },
    uiSchema: { ...get(blockSchema, "ui", {}), ...uiSchema },
  };
};

/**
 * Helper to get schema from block config, supporting both old and new formats
 * @internal
 */
export const getBlockSchema = (config: { props?: { schema?: any }; schema?: any }) => {
  return config.props?.schema || config.schema;
};

/**
 * Helper to get uiSchema from block config, supporting both old and new formats
 * @internal
 */
export const getBlockUiSchema = (config: { props?: { uiSchema?: any }; uiSchema?: any }) => {
  return config.props?.uiSchema || config.uiSchema;
};

export const StylesProp = (defaultClasses: string = ""): ChaiBlockPropsSchema => {
  console.warn("StylesProp is deprecated, use stylesProp instead");
  return {
    type: "string",
    styles: true,
    default: `${STYLES_KEY},${defaultClasses}`,
    ui: { "ui:widget": "hidden" },
  };
};

export const stylesProp = (defaultClasses: string = ""): ChaiBlockPropsSchema => {
  return {
    type: "string",
    styles: true,
    default: `${STYLES_KEY},${defaultClasses}`,
    ui: { "ui:widget": "hidden" },
  };
};

export const runtimeProp = (options: ChaiBlockPropsSchema): ChaiBlockPropsSchema => {
  console.warn("runtimeProp is deprecated, use builderProp instead");
  return {
    runtime: true,
    ...options,
  };
};

export const builderProp = (options: ChaiBlockPropsSchema): ChaiBlockPropsSchema => {
  return {
    builderProp: true,
    ...options,
  };
};

export const defaultChaiStyles = (classes: string) => `${STYLES_KEY},${classes}`;

export * from "./register-collection.ts";
export * from "./register-global-data-provider";
export * from "./register-page-type";
export * from "./register-partial-type";
export * from "./v2/runtime";
