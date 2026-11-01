/**
 * Lets the website keep working when it is deployed before the matching database
 * migration has been run: a query that names a column (or function argument) the
 * database doesn't have yet is retried the old way.
 */
type DbError = { code?: string; message?: string } | null;

export const isMissingColumn = (error: DbError) =>
  !!error && (error.code === '42703' || /column .* does not exist|Could not find the '.*' column/i.test(error.message ?? ''));

export const isMissingFunctionArg = (error: DbError) =>
  !!error && (error.code === 'PGRST202' || /Could not find the function/i.test(error.message ?? ''));

/** Runs the query with `base, extra` columns, or with `base` only if `extra` doesn't exist yet. */
export async function selectWithNewColumns<R extends { error: DbError }>(run: (columns: string) => PromiseLike<R>, base: string, extra: string): Promise<R> {
  const first = await run(`${base}, ${extra}`);
  return isMissingColumn(first.error) ? run(base) : first;
}
