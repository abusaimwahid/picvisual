export async function withProviderRollback<T>(work: () => Promise<T>, rollback: () => Promise<unknown>) {
  try {
    return await work();
  } catch (error) {
    await rollback().catch(() => undefined);
    throw error;
  }
}
