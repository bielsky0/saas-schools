import { filter, find, flatten } from "lodash-es";
import { generateUUID } from "~/core/functions/common-functions";
import { ChaiBlock } from "~/types/common";

export const nestedToFlatArray = (nestedJson: Array<ChaiBlock>, parent: string | null = null): Array<ChaiBlock> =>
  flatten(
    nestedJson.map((block: any) => {
      block = parent !== null ? { ...block, _parent: parent } : block;
      if (block.children && block.children.length) {
        const children = [...block.children];

        delete block.children;
        return flatten([block, ...nestedToFlatArray(children, block._id)]);
      }
      return block;
    }),
  );

export function duplicateBlocks(
  blocks: Partial<ChaiBlock>[],
  id: string,
  _parent: string | null,
): Partial<ChaiBlock>[] {
  const children = filter(blocks, (c) => c._parent === id);
  const newBlocks: Array<any> = [];
  for (let i = 0; i < children.length; i++) {
    if (filter(blocks, { _parent: children[i]._id }).length > 0) {
      const newId = generateUUID();
      newBlocks.push({ ...children[i], oldId: children[i]._id, ...{ _id: newId, _parent } });
      newBlocks.push(flatten(duplicateBlocks(blocks, children[i]._id!, newId)));
    } else {
      newBlocks.push({
        ...children[i],
        oldId: children[i]._id,
        ...{ _id: generateUUID(), _parent },
      });
    }
  }
  return flatten(newBlocks);
}

export function convertToBlocksTree(blocks: ChaiBlock[]) {
  // Create a map to store nodes by their ids
  const idMap: Record<string, any> = {};
  blocks.forEach((item) => {
    idMap[item._id] = { ...item, children: [] };
  });

  // Create the result array to store top level nodes
  const result: any[] = [];

  blocks.forEach((item) => {
    if (item._parent) {
      // If the item has a parent, find the parent and add the node to its children
      const parent = idMap[item._parent];
      if (parent) {
        parent.children.push(idMap[item._id]);
      }
    } else {
      // If the item has no parent, it is a top level node
      result.push(idMap[item._id]);
    }
  });

  return result;
}

/**
 * Return the cloned array of blocks
 * @param currentBlocks
 * @param id
 * @param newParentId
 */
export const getDuplicatedBlocks = (
  currentBlocks: Partial<ChaiBlock>[],
  id: string,
  newParentId: string | null = null,
): ChaiBlock[] => {
  let block = find(currentBlocks, { _id: id }) as ChaiBlock;
  // @ts-ignore
  block = { ...block, oldId: block._id, _id: generateUUID() };

  if (newParentId !== block?._parent) {
    // @ts-ignore
    block = { ...block, _parent: newParentId };
  }

  const blocks: ChaiBlock[] = [block];

  if (filter(currentBlocks, { _parent: id }).length > 0) {
    // @ts-ignore
    blocks.push(flatten(duplicateBlocks(currentBlocks, id, block._id)));
  }

  return flatten(blocks);
};
