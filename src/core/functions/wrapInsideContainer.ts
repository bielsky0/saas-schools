import { getBlockDefaultProps } from "~/runtime";
import { ChaiBlock } from "~/types/common";

export const wrapInsideContainer = (container: ChaiBlock | "Body" | "Html") => {
  return container ? container : { ...getBlockDefaultProps(container as string), _id: "container", _type: container };
};
