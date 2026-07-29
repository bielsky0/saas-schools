export let CHAI_GLOBAL_DATA_PROVIDER: (args: {
  lang: string;
  draft: boolean;
  inBuilder: boolean;
}) => Promise<any> = async (args) => ({
  ...args,
});

export const registerChaiGlobalDataProvider = <T>(
  globalDataProvider: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
  }) => Promise<T>
) => {
  CHAI_GLOBAL_DATA_PROVIDER = globalDataProvider;
};

export const getChaiGlobalData = async (args: {
  lang: string;
  draft: boolean;
  inBuilder: boolean;
}) => {
  try {
    return await CHAI_GLOBAL_DATA_PROVIDER(args);
  } catch (error) {
    console.error(error);
    return {};
  }
};
