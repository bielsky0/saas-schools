import type { SectionTreeNode } from "./section-groups";

export interface BlockPathNode {
  _id: string;
  _type?: string;
  _name?: string;
}

/**
 * Returns the path from the tree root down to the node with the given id
 * (breadcrumb trail), or an empty array when the node is not present.
 */
export const findPath = (nodes: SectionTreeNode[], id: string): BlockPathNode[] => {
  for (const node of nodes) {
    if (node._id === id) return [{ _id: node._id, _type: node._type, _name: node._name }];
    if (node.children?.length) {
      const childPath = findPath(node.children, id);
      if (childPath.length) return [{ _id: node._id, _type: node._type, _name: node._name }, ...childPath];
    }
  }
  return [];
};

/** Human readable name for a breadcrumb segment (mirrors `getBlockDisplayName`). */
export const blockPathName = (node: BlockPathNode): string => {
  if (node._name) return node._name;
  return (node._type ?? "").split("/").pop() || "";
};