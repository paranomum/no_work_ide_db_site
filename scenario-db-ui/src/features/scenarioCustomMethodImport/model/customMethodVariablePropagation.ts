import type {
  ScenarioCustomMethodResolution,
} from './scenarioCustomMethodImport.types';

type JsonRecord = Record<string, unknown>;

export const CUSTOM_METHOD_VARIABLE_NAMES_KEY =
  '__customMethodVariableNames';

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeVariableName(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

function parseScenarioPayload(
  scenarioPayloadJson: string,
): JsonRecord | null {
  try {
    const payload: unknown = JSON.parse(scenarioPayloadJson);

    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function getPayloadVariables(
  payload: JsonRecord,
): JsonRecord[] {
  if (!Array.isArray(payload.variables)) {
    return [];
  }

  return payload.variables.filter(isRecord);
}

function getVariableName(
  variable: JsonRecord,
): string {
  return typeof variable.name === 'string'
    ? variable.name.trim()
    : '';
}

function getResolvedCustomMethodPayloads(
  resolutions: ScenarioCustomMethodResolution[],
): JsonRecord[] {
  const usedScenarioIds = new Set<number>();

  return resolutions.flatMap((resolution) => {
    const targetScenario = resolution.targetScenario;

    if (
      resolution.kind === 'unresolved' ||
      !targetScenario ||
      usedScenarioIds.has(targetScenario.id)
    ) {
      return [];
    }

    usedScenarioIds.add(targetScenario.id);

    const childPayload = parseScenarioPayload(
      targetScenario.scenarioPayloadJson,
    );

    return childPayload ? [childPayload] : [];
  });
}

function getCustomMethodVariableNames(
  childPayloads: JsonRecord[],
): string[] {
  const variableNames = new Map<string, string>();

  childPayloads.forEach((childPayload) => {
    getPayloadVariables(childPayload).forEach(
      (childVariable) => {
        const variableName = getVariableName(childVariable);

        if (!variableName) {
          return;
        }

        const normalizedVariableName =
          normalizeVariableName(variableName);

        if (!variableNames.has(normalizedVariableName)) {
          variableNames.set(normalizedVariableName, variableName);
        }
      },
    );
  });

  return Array.from(variableNames.values());
}

export function addMissingCustomMethodVariables(
  parentPayload: JsonRecord,
  resolutions: ScenarioCustomMethodResolution[],
): JsonRecord {
  const parentVariables = getPayloadVariables(parentPayload);

  const childPayloads =
    getResolvedCustomMethodPayloads(resolutions);

  const customMethodVariableNames =
    getCustomMethodVariableNames(childPayloads);

  const existingVariableNames = new Set(
    parentVariables
      .map(getVariableName)
      .filter(Boolean)
      .map(normalizeVariableName),
  );

  const missingVariables: JsonRecord[] = [];

  childPayloads.forEach((childPayload) => {
    getPayloadVariables(childPayload).forEach(
      (childVariable) => {
        const variableName = getVariableName(childVariable);

        if (!variableName) {
          return;
        }

        const normalizedVariableName =
          normalizeVariableName(variableName);

        if (
          existingVariableNames.has(normalizedVariableName)
        ) {
          return;
        }

        existingVariableNames.add(normalizedVariableName);

        missingVariables.push({
          ...childVariable,
          name: variableName,
        });
      },
    );
  });

  const nextPayload: JsonRecord = {
    ...parentPayload,
    variables:
      missingVariables.length > 0
        ? [...parentVariables, ...missingVariables]
        : parentVariables,
  };

  Object.defineProperty(
    nextPayload,
    CUSTOM_METHOD_VARIABLE_NAMES_KEY,
    {
      value: customMethodVariableNames,
      enumerable: false,
      configurable: true,
      writable: false,
    },
  );

  return nextPayload;
}
