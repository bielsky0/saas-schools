import { atom } from "jotai";
import { splitAtom } from "jotai/utils";
import { filter, has } from "lodash-es";
import { convertToBlocksTree } from "~/core/functions/blocks-fn";
import { StructureError } from "~/hooks/structure-rules";
import { ChaiBlock } from "~/types/common";

// derived atoms
export const presentBlocksAtom = atom<ChaiBlock[]>([]);
presentBlocksAtom.debugLabel = "presentBlocksAtom";

//TODO: Need a better name for this atom. Also should be a custom hook
export const treeDSBlocks = atom((get) => {
  const presentBlocks = get(presentBlocksAtom);
  return convertToBlocksTree([...presentBlocks] as ChaiBlock[]);
});
treeDSBlocks.debugLabel = "treeDSBlocks";

export const pageBlocksAtomsAtom = splitAtom(presentBlocksAtom);
pageBlocksAtomsAtom.debugLabel = "pageBlocksAtomsAtom";

export const builderActivePageAtom = atom<string>("");
builderActivePageAtom.debugLabel = "builderActivePageAtom";

export const destinationDropIndexAtom = atom<number>(-1);
destinationDropIndexAtom.debugLabel = "destinationDropIndexAtom";

export const buildingBlocksAtom: any = atom<Array<any>>([]);
buildingBlocksAtom.debugLabel = "buildingBlocksAtom";

export const globalBlocksAtom = atom<Array<any>>((get) => {
  const globalBlocks = get(buildingBlocksAtom) as Array<any>;
  return filter(globalBlocks, (block) => has(block, "blockId"));
});
globalBlocksAtom.debugLabel = "globalBlocksAtom";

// Structure validation atoms
export const structureErrorsAtom = atom<StructureError[]>([]);
structureErrorsAtom.debugLabel = "structureErrorsAtom";

export const structureValidationValidAtom = atom<boolean>(true);
structureValidationValidAtom.debugLabel = "structureValidationValidAtom";

export const hasStructureErrorsAtom = atom<boolean>(false);
hasStructureErrorsAtom.debugLabel = "hasStructureErrorsAtom";

export const hasStructureWarningsAtom = atom<boolean>(false);
hasStructureWarningsAtom.debugLabel = "hasStructureWarningsAtom";

// Derived atoms for computed values
export const structureErrorCountAtom = atom<number>((get) => {
  const errors = get(structureErrorsAtom);
  return errors.filter((e) => e.severity === "error").length;
});
structureErrorCountAtom.debugLabel = "structureErrorCountAtom";

export const structureWarningCountAtom = atom<number>((get) => {
  const errors = get(structureErrorsAtom);
  return errors.filter((e) => e.severity === "warning").length;
});
structureWarningCountAtom.debugLabel = "structureWarningCountAtom";

export const structureErrorsByBlockAtom = atom<Record<string, StructureError[]>>((get) => {
  const errors = get(structureErrorsAtom);
  const errorsByBlock: Record<string, StructureError[]> = {};

  errors.forEach((error) => {
    if (error.blockId) {
      if (!errorsByBlock[error.blockId]) {
        errorsByBlock[error.blockId] = [];
      }
      errorsByBlock[error.blockId].push(error);
    }
  });

  return errorsByBlock;
});
structureErrorsByBlockAtom.debugLabel = "structureErrorsByBlockAtom";
