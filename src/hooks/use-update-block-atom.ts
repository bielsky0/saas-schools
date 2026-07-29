import { Atom, atom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import { find, isString } from "lodash-es";
import { useCallback } from "react";
import { pageBlocksAtomsAtom } from "~/atoms/blocks";
import { builderStore } from "~/atoms/store";
import { ChaiBlock } from "~/types/common";

const writeAtomValue = atom(
  null, // it's a convention to pass `null` for the first argument
  (get, set, { id, props }: { id: string; props: Record<string, any> }) => {
    const blockAsAtoms = get(pageBlocksAtomsAtom);
    const blockAtom = find(blockAsAtoms, (b) => (get(b) as ChaiBlock)._id === id);
    if (!blockAtom) {
      return null;
    }
    return set(blockAtom, { ...(get(blockAtom) as any), ...props });
  },
);

export const useUpdateBlockAtom = () => {
  return useSetAtom(writeAtomValue);
};

export const useGetBlockAtomValue = (splitAtoms: Atom<Atom<ChaiBlock>[]>) => {
  return useAtomCallback(
    useCallback(
      (get, _set, idOrAtom: Atom<ChaiBlock> | string) => {
        const blockAsAtoms = get(splitAtoms);
        if (!blockAsAtoms || !blockAsAtoms.length) {
          return null;
        }
        const blockAtom = find(
          blockAsAtoms,
          (b) => (get(b) as ChaiBlock)._id === (isString(idOrAtom) ? idOrAtom : get(idOrAtom as Atom<ChaiBlock>)._id),
        );
        if (!blockAtom) {
          return null;
        }
        return get(blockAtom) as ChaiBlock;
      },
      [splitAtoms],
    ),
    { store: builderStore },
  );
};

export const useGetBlockAtom = (splitAtoms: Atom<Atom<ChaiBlock>[]>) => {
  return useAtomCallback(
    useCallback(
      (get, _set, idOrAtom: Atom<ChaiBlock> | string) => {
        const blockAsAtoms = get(splitAtoms);
        if (!blockAsAtoms || !blockAsAtoms.length) {
          console.warn("No blocks available in splitAtoms");
          return null;
        }
        const blockAtom = find(
          blockAsAtoms,
          (b) => (get(b) as ChaiBlock)._id === (isString(idOrAtom) ? idOrAtom : get(idOrAtom as Atom<ChaiBlock>)._id),
        );
        if (!blockAtom) {
          console.warn(`Block with id ${idOrAtom} not found`);
          return null;
        }
        return blockAtom;
      },
      [splitAtoms],
    ),
    { store: builderStore },
  );
};
