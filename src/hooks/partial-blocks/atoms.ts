import { atom } from "jotai";
import { PartialBlockEntry, PartialBlockList } from "~/types/partial-blocks";

/**
 * Consolidated atom storing all partial block data
 */
export const partialBlocksAtom = atom<Record<string, PartialBlockEntry>>({});

/**
 * Atom for storing the list of available partial blocks
 */
export const partialBlocksListAtom = atom<PartialBlockList>({});
