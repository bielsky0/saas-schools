export const apiError = (code: string, error: unknown) => {
  console.error(error);
  return new Error(code);
};
