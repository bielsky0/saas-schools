import { get, has } from "lodash-es";
import { ChaiBlock } from "~/types/common";

export type CollectionFetchParams = {
  block: ChaiBlock;
  inBuilder: boolean;
  draft: boolean;
  lang: string;
  pageProps: {
    slug: string;
    params?: Record<string, string>;
    [key: string]: any;
  };
};

interface CollectionConfig<T> {
  id: string;
  name: string;
  icon?: string;
  filters?: { id: string; name: string }[];
  sort?: { id: string; name: string }[];
  fetch: (params: CollectionFetchParams) => Promise<{ items: T[]; totalItems?: number }>;
}

export const COLLECTIONS: Record<string, CollectionConfig<any>> = {};

export function registerChaiCollection<T = Record<any, any>>(id: string, collection: Omit<CollectionConfig<T>, "id">) {
  if (has(COLLECTIONS, id)) {
    console.warn(`Collection ${id} already registered`);
  }
  COLLECTIONS[id] = { ...collection, id };
}

export const getChaiCollections = () => Object.values(COLLECTIONS);

export const getChaiCollection = (key: string) => get(COLLECTIONS, key);
