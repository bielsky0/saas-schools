import { atom } from "jotai";

/**
 * Shared click detection state for coordinating between DND and canvas handlers
 */
export const lastClickTimeAtom = atom<number>(0);
export const clickCountAtom = atom<number>(0);
