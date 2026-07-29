import { chaiExternalDataAtom } from "~/atoms/builder";
import { useAtom } from "jotai";

export const useChaiExternalData = () => useAtom(chaiExternalDataAtom);
