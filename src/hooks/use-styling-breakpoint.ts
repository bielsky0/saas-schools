import { styleBreakpointAtom } from "~/hooks/use-selected-blockIds";
import { useAtom } from "jotai";

export const useStylingBreakpoint = () => useAtom(styleBreakpointAtom);
