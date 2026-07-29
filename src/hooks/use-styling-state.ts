import { styleStateAtom } from "~/hooks/use-selected-blockIds";
import { useAtom } from "jotai";

export const useStylingState = () => useAtom(styleStateAtom);
