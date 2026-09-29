export type ParameterizedSql = { sql: string; params: string[] };

function safeIdentifier(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(identifier)) {
    throw new Error('Identifier SQL tidak valid.');
  }
  return identifier;
}

export function mysqlInFilter(column: string, values: string[]): ParameterizedSql {
  const safeColumn = safeIdentifier(column);
  if (values.length === 0) return { sql: '1 = 0', params: [] };
  return {
    sql: `${safeColumn} IN (${values.map(() => '?').join(', ')})`,
    params: values,
  };
}

export function mysqlNullsLast(column: string, direction: 'asc' | 'desc') {
  const safeColumn = safeIdentifier(column);
  const order = direction.toUpperCase();
  return `${safeColumn} IS NULL ASC, ${safeColumn} ${order}`;
}
