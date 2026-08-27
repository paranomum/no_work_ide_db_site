import type { ScenarioResponse } from '../../../shared/types/scenario';
import type { ImportedScenarioCustomMethod } from './importedScenarioCustomMethod';
import type {
  ScenarioCustomMethodResolution,
} from './scenarioCustomMethodImport.types';

function normalizeScenarioName(name: string): string {
  return name.trim().toLocaleLowerCase('ru-RU');
}

export function createScenarioCustomMethodResolutions(
  importedCustomMethods: ImportedScenarioCustomMethod[],
  availableScenarios: ScenarioResponse[],
  previousResolutions: ScenarioCustomMethodResolution[] = [],
): ScenarioCustomMethodResolution[] {
  const previousResolutionsByImportedName = new Map(
    previousResolutions.map((resolution) => [
      normalizeScenarioName(resolution.importedCustomMethod.name),
      resolution,
    ]),
  );

  return importedCustomMethods.map((importedCustomMethod) => {
    const previousResolution = previousResolutionsByImportedName.get(
      normalizeScenarioName(importedCustomMethod.name),
    );

    if (previousResolution?.targetScenario) {
      const stillAvailableScenario = availableScenarios.find(
        (scenario) =>
          scenario.id === previousResolution.targetScenario?.id,
      );

      if (stillAvailableScenario) {
        return {
          importedCustomMethod,
          targetScenario: stillAvailableScenario,
          kind:
            previousResolution.kind === 'existing'
              ? 'existing'
              : 'selected-existing',
        };
      }
    }

    const existingScenario = availableScenarios.find(
      (scenario) =>
        normalizeScenarioName(scenario.name) ===
        normalizeScenarioName(importedCustomMethod.name),
    );

    if (existingScenario) {
      return {
        importedCustomMethod,
        targetScenario: existingScenario,
        kind: 'existing',
      };
    }

    return {
      importedCustomMethod,
      targetScenario: null,
      kind: 'unresolved',
    };
  });
}

export function getCustomMethodNameReplacements(
  resolutions: ScenarioCustomMethodResolution[],
): Array<{ from: string; to: string }> {
  return resolutions.flatMap((resolution) => {
    if (!resolution.targetScenario) {
      return [];
    }

    return [
      {
        from: resolution.importedCustomMethod.name,
        to: resolution.targetScenario.name,
      },
    ];
  });
}

export function getCustomMethodScenarioIds(
  resolutions: ScenarioCustomMethodResolution[],
): number[] {
  const scenarioIds = new Set<number>();

  resolutions.forEach((resolution) => {
    if (resolution.targetScenario) {
      scenarioIds.add(resolution.targetScenario.id);
    }
  });

  return [...scenarioIds];
}
