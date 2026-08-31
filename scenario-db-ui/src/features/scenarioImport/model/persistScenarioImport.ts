import { http } from '../../../shared/api/http';
import type {
  ScenarioResponse,
} from '../../../shared/types/scenario';
import type {
  PersistScenarioImportInput,
} from './scenarioImport.types';


interface ScenarioImportCustomMethodResolutionRequest {
  importedCustomMethodName: string;
  kind: 'existing' | 'selected-existing';
  targetScenarioId: number;
}


interface ScenarioImportVariableResolutionRequest {
  importedVariable: {
    name: string;
    defaultValue: string;
    isUserVariable: boolean;
    position: number;
  };
  kind: 'existing' | 'selected-existing' | 'create-new-user';
  targetVariableId: number | null;
}


export async function persistScenarioImport({
  payload,
  backendResolutions,
  variableResolutions,
  customMethodResolutions,
  values,
}: PersistScenarioImportInput): Promise<ScenarioResponse> {
  const resolvedCustomMethodResolutions =
    customMethodResolutions.map((resolution) => {
      const importedCustomMethodName =
        resolution.importedCustomMethod.name.trim();

      const targetScenarioId = resolution.targetScenario?.id;

      if (!importedCustomMethodName) {
        throw new Error(
          'Не задано имя импортируемого custom method',
        );
      }

      if (
        resolution.kind === 'unresolved' ||
        typeof targetScenarioId !== 'number'
      ) {
        throw new Error(
          `Не выбран сценарий для custom method «${importedCustomMethodName}»`,
        );
      }

      return {
        importedCustomMethodName,
        kind: resolution.kind,
        targetScenarioId,
      } satisfies ScenarioImportCustomMethodResolutionRequest;
    });


  const resolvedVariableResolutions = variableResolutions.map(
    (resolution) => {
      const { importedVariable } = resolution;

      if (resolution.kind === 'unresolved') {
        throw new Error(
          `Не разрешена переменная «${importedVariable.name}»`,
        );
      }

      if (!importedVariable.isUserVariable) {
        return {
          importedVariable: {
            name: importedVariable.name,
            defaultValue: importedVariable.defaultValue,
            isUserVariable: false,
            position: importedVariable.position,
          },
          kind: 'existing',
          targetVariableId: null,
        } satisfies ScenarioImportVariableResolutionRequest;
      }

      if (
        resolution.kind === 'existing' ||
        resolution.kind === 'selected-existing'
      ) {
        const targetVariableId = resolution.targetVariable?.id;

        if (typeof targetVariableId !== 'number') {
          throw new Error(
            `Не выбрана существующая пользовательская переменная для «${importedVariable.name}»`,
          );
        }

        return {
          importedVariable: {
            name: importedVariable.name,
            defaultValue: importedVariable.defaultValue,
            isUserVariable: true,
            position: importedVariable.position,
          },
          kind: resolution.kind,
          targetVariableId,
        } satisfies ScenarioImportVariableResolutionRequest;
      }

      if (resolution.kind === 'create-new-user') {
        return {
          importedVariable: {
            name: importedVariable.name,
            defaultValue: importedVariable.defaultValue,
            isUserVariable: true,
            position: importedVariable.position,
          },
          kind: 'create-new-user',
          targetVariableId: null,
        } satisfies ScenarioImportVariableResolutionRequest;
      }

      throw new Error(
        `Неподдерживаемый тип решения переменной: ${resolution.kind}`,
      );
    },
  );


  const { data } = await http.post<ScenarioResponse>(
    '/scenarios/import',
    {
      payload,
      backendResolutions,
      variableResolutions: resolvedVariableResolutions,
      customMethodResolutions: resolvedCustomMethodResolutions,
      values,
    },
  );

  return data;
}
