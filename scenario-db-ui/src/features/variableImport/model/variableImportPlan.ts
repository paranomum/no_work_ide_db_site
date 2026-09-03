import type {
  BackendRequestDto,
  ScenarioVariableMigration,
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

function normalizeVariableName(name: string): string {
  return name.trim().toLocaleLowerCase('ru-RU');
}

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
      normalizeVariableName(variable.name) ===
        normalizeVariableName(importedVariable.name),
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
  migrations: ScenarioVariableMigration[] = [],
): VariableResolution[] {
  const previousResolutionsByName = new Map(
    currentResolutions.map((resolution) => [
      normalizeVariableName(resolution.importedVariable.name),
      resolution,
    ]),
  );

  const migrationsByName = new Map(
    migrations
      .filter(
        (migration) =>
          migration.variable.name.trim().length > 0,
      )
      .map((migration) => [
        normalizeVariableName(migration.variable.name),
        migration,
      ]),
  );

  const importedVariables = parseImportedScenarioVariables(
    payload,
    resolvedBackendRequests,
  );

  return importedVariables.map((importedVariable) => {
    const migration = migrationsByName.get(
      normalizeVariableName(importedVariable.name),
    );

    const mergedImportedVariable = migration
  ? {
      ...importedVariable,
      name: migration.variable.name.trim(),
      defaultValue: migration.variable.isUserVariable
        ? ''
        : migration.importedScenarioDefaultValue,
      isUserVariable: migration.variable.isUserVariable,
    }
  : importedVariable;

    return createVariableResolution(
      mergedImportedVariable,
      platformVariables,
      previousResolutionsByName.get(
        normalizeVariableName(mergedImportedVariable.name),
      ),
    );
  });
}
