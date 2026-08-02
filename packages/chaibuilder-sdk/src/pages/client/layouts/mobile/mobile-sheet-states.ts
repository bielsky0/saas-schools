import { atom } from "jotai";

export type MobileSheetState = "collapsed" | "settings" | "menu" | "theme" | "pages" | "actions";

export const mobileSheetAtom = atom<MobileSheetState>("collapsed");
mobileSheetAtom.debugLabel = "mobileSheetAtom";

export const inspectorEnabledAtom = atom(false);
inspectorEnabledAtom.debugLabel = "inspectorEnabledAtom";
