type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function replaceVariableExpression(
  value: string,
  from: string,
  to: string,
): string {
  return value.replaceAll(`\${${from}}`, `\${${to}}`);
}

function replaceInNode(
  value: unknown,
  from: string,
  to: string,
): unknown {
  if (typeof value === 'string') {
    return replaceVariableExpression(value, from, to);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceInNode(item, from, to));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (key === 'variableName' && item === from) {
        return [key, to];
      }

      return [key, replaceInNode(item, from, to)];
    }),
  );
}

export function updatePayloadVariableValue(
  payload: JsonRecord,
  variableName: string,
  defaultValue: string,
): JsonRecord {
  const variables = Array.isArray(payload.variables)
    ? payload.variables
    : [];

  return {
    ...payload,
    variables: variables.map((item) => {
      if (!isRecord(item) || item.name !== variableName) {
        return item;
      }

      return {
        ...item,
        value: defaultValue,
      };
    }),
  };
}

export function removePayloadVariable(
  payload: JsonRecord,
  variableName: string,
): JsonRecord {
  const variables = Array.isArray(payload.variables)
    ? payload.variables
    : [];

  return {
    ...payload,
    variables: variables.filter(
      (item) => !isRecord(item) || item.name !== variableName,
    ),
  };
}

export function replacePayloadVariableReferences(
  payload: JsonRecord,
  from: string,
  to: string,
): JsonRecord {
  return replaceInNode(payload, from, to) as JsonRecord;
}
