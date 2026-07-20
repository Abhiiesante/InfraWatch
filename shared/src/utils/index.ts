export const generateId = (): string => {
  return crypto.randomUUID();
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
