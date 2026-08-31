import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { http } from '../../../shared/api/http';
import type {
  ScenarioVariableResponse,
} from '../../../shared/types/scenario';
import type {
  ScenarioCustomMethodResolution,
} from '../model/scenarioCustomMethodImport.types';

export interface RelatedScenarioVariableUsage {
  scenarioId: number;
  scenarioName: string;
  variableId: number;
  variableName: string;
  isUserVariable: boolean;
}

interface UseRelatedScenarioVariableUsagesResult {
  isLoading: boolean;
  error: string | null;
  getUsages: (
    importedVariableName: string,
  ) => RelatedScenarioVariableUsage[];
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('ru-RU');
}

export function useRelatedScenarioVariableUsages(
  resolutions: ScenarioCustomMethodResolution[],
): UseRelatedScenarioVariableUsagesResult {
  const [variablesByScenarioId, setVariablesByScenarioId] = useState<
    Map<number, ScenarioVariableResponse[]>
  >(new Map());

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relatedScenarios = useMemo(() => {
    const scenariosById = new Map<
      number,
      { id: number; name: string }
    >();

    resolutions.forEach((resolution) => {
      if (!resolution.targetScenario) {
        return;
      }

      scenariosById.set(resolution.targetScenario.id, {
        id: resolution.targetScenario.id,
        name: resolution.targetScenario.name,
      });
    });

    return Array.from(scenariosById.values());
  }, [resolutions]);


  useEffect(() => {
    let isMounted = true;

    const loadVariables = async () => {
      if (relatedScenarios.length === 0) {
        setVariablesByScenarioId(new Map());
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const responses = await Promise.all(
          relatedScenarios.map(async (scenario) => {
            const { data } = await http.get<
              ScenarioVariableResponse[]
            >(`/scenarios/${scenario.id}/variables`);

            return {
              scenarioId: scenario.id,
              variables: data,
            };
          }),
        );

        if (!isMounted) {
          return;
        }

        setVariablesByScenarioId(
          new Map(
            responses.map((response) => [
              response.scenarioId,
              response.variables,
            ]),
          ),
        );
      } catch {
        if (isMounted) {
          setVariablesByScenarioId(new Map());
          setError(
            'Не удалось проверить переменные связанных сценариев',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadVariables();

    return () => {
      isMounted = false;
    };
  }, [relatedScenarios]);

  const getUsages = useCallback((
  importedVariableName: string,
): RelatedScenarioVariableUsage[] => {
    const normalizedVariableName = normalizeName(
      importedVariableName,
    );

    return relatedScenarios.flatMap((scenario) => {
      const variables =
        variablesByScenarioId.get(scenario.id) ?? [];

      return variables.flatMap((variable) => {
        if (
          normalizeName(variable.name) !== normalizedVariableName
        ) {
          return [];
        }

        return [
          {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            variableId: variable.variableId,
            variableName: variable.name,
            isUserVariable: variable.isUserVariable,
          },
        ];
      });
    });
  }, [relatedScenarios, variablesByScenarioId]);

  return {
    isLoading,
    error,
    getUsages,
  };
}
