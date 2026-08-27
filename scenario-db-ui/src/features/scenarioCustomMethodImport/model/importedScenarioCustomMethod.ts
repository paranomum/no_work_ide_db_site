export interface ImportedScenarioCustomMethod {
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function collectCustomMethodNames(
  value: unknown,
  names: string[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCustomMethodNames(item, names));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  if (
    value.action === 'customMethod' &&
    typeof value.value === 'string' &&
    value.value.trim()
  ) {
    names.push(value.value.trim());
  }

  Object.values(value).forEach((nestedValue) => {
    collectCustomMethodNames(nestedValue, names);
  });
}

export function parseImportedScenarioCustomMethods(
  payload: Record<string, unknown>,
): ImportedScenarioCustomMethod[] {
  const names: string[] = [];

  collectCustomMethodNames(payload, names);

  const usedNames = new Set<string>();

  return names.flatMap((name) => {
    const normalizedName = name.toLocaleLowerCase('ru-RU');

    if (usedNames.has(normalizedName)) {
      return [];
    }

    usedNames.add(normalizedName);

    return [{ name }];
  });
}
