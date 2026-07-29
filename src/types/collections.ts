type FilterOptions = {
  id: string;
  name: string;
  description?: string;
};

type SortOptions = {
  id: string;
  name: string;
  description?: string;
};

export type ChaiCollectoin = {
  id: string;
  name: string;
  description?: string;
  filters?: FilterOptions[];
  sorts?: SortOptions[];
};
