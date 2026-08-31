import { useMemo, useState } from 'react';

import {
  replaceVariableInBackendResolution,
} from '../../backendRequestMerge/model/backendRequestVariableMutations';
import type {
  BackendRequestResolution,
} from '../../backendRequestMerge/model/backendRequestImport.types';
import type {
  VariableDto,
} from '../../../shared/types/variable';
import {
  getUnresolvedVariableResolutions,
  rebuildVariableResolutions,
} from '../model/variableImportPlan';
import {
  removePayloadVariable,
  replacePayloadVariableReferences,
  updatePayloadVariableValue,
} from '../model/variablePayloadMutations';
import type {
  VariableResolution,
} from '../model/variableImport.types';

interface UseVariableImportParams {
  platformVariables: VariableDto[];
  setPayload: React.Dispatch<
    React.SetStateAction<Record<string, unknown> | null>
  >;
  replaceBackendResolutions: (
    update: (
      resolutions: BackendRequestResolution[],
    ) => BackendRequestResolution[],
  ) => void;
}

interface UseVariableImportResult {
  resolutions: VariableResolution[];
  unresolvedResolutions: VariableResolution[];
  isResolved: boolean;
  setResolutions: React.Dispatch<
    React.SetStateAction<VariableResolution[]>
  >;
  rebuildResolutions: (
  payload: Record<string, unknown>,
  backendResolutions: BackendRequestResolution[],
  platformVariables: VariableDto[],
  previousResolutions?: VariableResolution[],
) => VariableResolution[];
  selectPlatformVariable: (
    importedVariableName: string,
    selectedVariableId: number,
  ) => void;
  markUserVariableForCreation: (
    importedVariableName: string,
  ) => void;
  resetVariableResolution: (
    importedVariableName: string,
  ) => void;
  changeVariableType: (
    importedVariableName: string,
    isUserVariable: boolean,
  ) => void;
  changeVariableValue: (
    importedVariableName: string,
    defaultValue: string,
  ) => void;
  deleteVariable: (
    importedVariableName: string,
    replacementVariableName?: string,
  ) => void;
}

export function useVariableImport({
  platformVariables,
  setPayload,
  replaceBackendResolutions,
}: UseVariableImportParams): UseVariableImportResult {
  const [resolutions, setResolutions] = useState<
    VariableResolution[]
  >([]);

  const unresolvedResolutions = useMemo(
    () => getUnresolvedVariableResolutions(resolutions),
    [resolutions],
  );

  const isResolved = unresolvedResolutions.length === 0;

  const rebuildResolutions = (
  nextPayload: Record<string, unknown>,
  nextBackendResolutions: BackendRequestResolution[],
  nextPlatformVariables: VariableDto[],
  previousResolutions: VariableResolution[] = [],
): VariableResolution[] =>
  rebuildVariableResolutions(
    nextPayload,
    nextBackendResolutions.map(
      (resolution) => resolution.resolvedRequest,
    ),
    nextPlatformVariables,
    previousResolutions,
  );

  const selectPlatformVariable = (
    importedVariableName: string,
    selectedVariableId: number,
  ) => {
    const selectedVariable = platformVariables.find(
      (variable) => variable.id === selectedVariableId,
    );

    if (!selectedVariable || !selectedVariable.isUserVariable) {
      return;
    }

    setResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName ||
          !resolution.importedVariable.isUserVariable
        ) {
          return resolution;
        }

        return {
          ...resolution,
          targetVariable: selectedVariable,
          kind: 'selected-existing',
        };
      }),
    );
  };

  const markUserVariableForCreation = (
    importedVariableName: string,
  ) => {
    setResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName ||
          !resolution.importedVariable.isUserVariable
        ) {
          return resolution;
        }

        const variableWithSameName = platformVariables.find(
          (variable) =>
            variable.name.toLocaleLowerCase('ru-RU') ===
            resolution.importedVariable.name.toLocaleLowerCase(
              'ru-RU',
            ),
        );

        if (variableWithSameName) {
          return resolution;
        }

        return {
          ...resolution,
          targetVariable: null,
          kind: 'create-new-user',
        };
      }),
    );
  };

  const resetVariableResolution = (
    importedVariableName: string,
  ) => {
    setResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        return {
          ...resolution,
          targetVariable: null,
          kind: resolution.importedVariable.isUserVariable
            ? 'unresolved'
            : 'existing',
        };
      }),
    );
  };

  const changeVariableType = (
    importedVariableName: string,
    isUserVariable: boolean,
  ) => {
    setResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        const importedVariable = {
          ...resolution.importedVariable,
          isUserVariable,
        };

        if (!isUserVariable) {
          return {
            importedVariable,
            targetVariable: null,
            kind: 'existing',
          };
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
      }),
    );
  };

  const changeVariableValue = (
    importedVariableName: string,
    defaultValue: string,
  ) => {
    setResolutions((currentResolutions) =>
      currentResolutions.map((resolution) => {
        if (
          resolution.importedVariable.name !== importedVariableName
        ) {
          return resolution;
        }

        return {
          ...resolution,
          importedVariable: {
            ...resolution.importedVariable,
            defaultValue,
          },
        };
      }),
    );

    setPayload((currentPayload) => {
      if (!currentPayload) {
        return currentPayload;
      }

      return updatePayloadVariableValue(
        currentPayload,
        importedVariableName,
        defaultValue,
      );
    });
  };

  const deleteVariable = (
    importedVariableName: string,
    replacementVariableName?: string,
  ) => {
    if (
      replacementVariableName &&
      replacementVariableName !== importedVariableName
    ) {
      replaceBackendResolutions((currentResolutions) =>
  currentResolutions.map((resolution) =>
    replaceVariableInBackendResolution(
      resolution,
      importedVariableName,
      replacementVariableName,
    ),
  ),
);

      setPayload((currentPayload) => {
        if (!currentPayload) {
          return currentPayload;
        }

        const payloadWithReplacedReferences =
          replacePayloadVariableReferences(
            currentPayload,
            importedVariableName,
            replacementVariableName,
          );

        return removePayloadVariable(
          payloadWithReplacedReferences,
          importedVariableName,
        );
      });
    } else {
      setPayload((currentPayload) => {
        if (!currentPayload) {
          return currentPayload;
        }

        return removePayloadVariable(
          currentPayload,
          importedVariableName,
        );
      });
    }

    setResolutions((currentResolutions) =>
      currentResolutions.filter(
        (resolution) =>
          resolution.importedVariable.name !== importedVariableName,
      ),
    );
  };

  return {
    resolutions,
    unresolvedResolutions,
    isResolved,
    setResolutions,
    rebuildResolutions,
    selectPlatformVariable,
    markUserVariableForCreation,
    resetVariableResolution,
    changeVariableType,
    changeVariableValue,
    deleteVariable,
  };
}
