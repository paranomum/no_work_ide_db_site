import type {
  BackendRequestDto,
} from '../../backendRequestMerge/model/backendRequestMerge.types';
import type {
  ImportedScenarioVariable,
} from './importedScenarioVariable';
import {
  parseImportedScenarioVariables,
} from './importedScenarioVariable';
import type {
  VariableResolution,
} from './variableImport.types';
import type {
  VariableDto,
} from '../../../shared/types/variable';

export function hasVariableValue(value: string): boolean {
  return value.trim().length > 0;
}

export function isVariableResolutionValid(
  resolution: VariableResolution,
): boolean {
  const { importedVariable } = resolution;

  if (!importedVariable.isUserVariable) {
    return hasVariableValue(importedVariable.defaultValue);
  }

  return (
    !hasVariableValue(importedVariable.defaultValue) &&
    resolution.kind !== 'unresolved'
  );
}

export function getUnresolvedVariableResolutions(
  resolutions: VariableResolution[],
): VariableResolution[] {
  return resolutions.filter(
    (resolution) => !isVariableResolutionValid(resolution),
  );
}

export function createVariableResolution(
  importedVariable: ImportedScenarioVariable,
  platformVariables: VariableDto[],
  previousResolution?: VariableResolution,
): VariableResolution {
  if (!importedVariable.isUserVariable) {
    return {
      importedVariable,
      targetVariable: null,
      kind: 'existing',
    };
  }

  if (
    previousResolution &&
    previousResolution.importedVariable.isUserVariable
  ) {
    if (previousResolution.kind === 'create-new-user') {
      return {
        importedVariable,
        targetVariable: null,
        kind: 'create-new-user',
      };
    }

    if (
      previousResolution.targetVariable &&
      previousResolution.targetVariable.isUserVariable
    ) {
      return {
        importedVariable,
        targetVariable: previousResolution.targetVariable,
        kind:
          previousResolution.kind === 'existing'
            ? 'existing'
            : 'selected-existing',
      };
    }
  }

  const platformVariableWithSameName = platformVariables.find(
    (variable) =>
      variable.isUserVariable &&
      variable.name.toLocaleLowerCase('ru-RU') ===
        importedVariable.name.toLocaleLowerCase('ru-RU'),
  );

  if (platformVariableWithSameName) {
    return {
      importedVariable,
      targetVariable: platformVariableWithSameName,
      kind: 'existing',
    };
  }

  return {
    importedVariable,
    targetVariable: null,
    kind: 'unresolved',
  };
}

export function rebuildVariableResolutions(
  payload: Record<string, unknown>,
  resolvedBackendRequests: BackendRequestDto[],
  platformVariables: VariableDto[],
  currentResolutions: VariableResolution[],
): VariableResolution[] {
  const previousResolutionsByName = new Map(
    currentResolutions.map((resolution) => [
      resolution.importedVariable.name.toLocaleLowerCase('ru-RU'),
      resolution,
    ]),
  );

  const importedVariables = parseImportedScenarioVariables(
    payload,
    resolvedBackendRequests,
  );

  return importedVariables.map((importedVariable) =>
    createVariableResolution(
      importedVariable,
      platformVariables,
      previousResolutionsByName.get(
        importedVariable.name.toLocaleLowerCase('ru-RU'),
      ),
    ),
  );
}
