import { http } from '../../../shared/api/http';
import type {
  CreateVariableRequest,
  VariableDto,
} from '../../../shared/types/variable';
import type {
  VariableResolution,
} from './variableImport.types';

export async function persistVariables(
  resolutions: VariableResolution[],
): Promise<Map<string, VariableDto>> {
  const variablesByImportedName = new Map<string, VariableDto>();

  for (const resolution of resolutions) {
    if (
      resolution.kind === 'existing' ||
      resolution.kind === 'selected-existing'
    ) {
      if (!resolution.targetVariable) {
        throw new Error(
          `Не выбрана переменная для «${resolution.importedVariable.name}»`,
        );
      }

      variablesByImportedName.set(
        resolution.importedVariable.name,
        resolution.targetVariable,
      );

      continue;
    }

    if (resolution.kind === 'create-new-user') {
      if (!resolution.importedVariable.isUserVariable) {
        throw new Error(
          `Нельзя создать сценарную переменную «${resolution.importedVariable.name}»`,
        );
      }

      const payload: CreateVariableRequest = {
        name: resolution.importedVariable.name,
        isUserVariable: true,
      };

      const { data: createdVariable } = await http.post<VariableDto>(
        '/variables',
        payload,
      );

      variablesByImportedName.set(
        resolution.importedVariable.name,
        createdVariable,
      );

      continue;
    }

    throw new Error(
      `Не разрешена переменная «${resolution.importedVariable.name}»`,
    );
  }

  return variablesByImportedName;
}

export function getVariableNameReplacements(
  resolutions: VariableResolution[],
  variablesByImportedName: Map<string, VariableDto>,
): Array<{ from: string; to: string }> {
  return resolutions
    .map((resolution) => {
      const targetVariable = variablesByImportedName.get(
        resolution.importedVariable.name,
      );

      if (!targetVariable) {
        throw new Error(
          `Не удалось определить переменную «${resolution.importedVariable.name}»`,
        );
      }

      return {
        from: resolution.importedVariable.name,
        to: targetVariable.name,
      };
    })
    .filter((replacement) => replacement.from !== replacement.to);
}
