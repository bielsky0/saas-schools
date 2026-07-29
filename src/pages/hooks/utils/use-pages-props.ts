import { atom, useAtom } from "jotai";

export const pagesPropsAtom = atom<any>({});

export const usePagesProps = () => {
  return useAtom(pagesPropsAtom);
};
