import { useMemo, useState } from 'react';

import { http } from '../../../shared/api/http';
import type {
  ScenarioResponse,
} from '../../../shared/types/scenario';
import {
  createScenarioCustomMethodResolutions,
} from '../model/scenarioCustomMethodImportPlan';
import {
  parseImportedScenarioCustomMethods,
} from '../model/importedScenarioCustomMethod';
import type {
  ScenarioCustomMethodResolution,
} from '../model/scenarioCustomMethodImport.types';

interface UseScenarioCustomMethodImportResult {
  availableScenarios: ScenarioResponse[];
  resolutions: ScenarioCustomMethodResolution[];
  isLoading: boolean;
  isMissingModalOpen: boolean;
  unresolvedResolutions: ScenarioCustomMethodResolution[];
  unresolvedMethodNames: string[];
  isResolved: boolean;
  initialize: (
    payload: Record<string, unknown>,
    scenarios: ScenarioResponse[],
  ) => ScenarioCustomMethodResolution[];
  initializeFromApi: (
  payload: Record<string, unknown>,
) => Promise<ScenarioCustomMethodResolution[]>;
  refresh: (
    payload: Record<string, unknown>,
  ) => Promise<void>;
  selectScenario: (
    importedCustomMethodName: string,
    scenarioId: number,
  ) => void;
  closeMissingModal: () => void;
  openScenarioCreateInNewTab: () => void;
  reset: () => void;
}

export function useScenarioCustomMethodImport(): UseScenarioCustomMethodImportResult {
  const [availableScenarios, setAvailableScenarios] = useState<
    ScenarioResponse[]
  >([]);

  const [resolutions, setResolutions] = useState<
    ScenarioCustomMethodResolution[]
  >([]);

  const [isLoading, setIsLoading] = useState(false);

  const [isMissingModalOpen, setIsMissingModalOpen] =
    useState(false);

  const unresolvedResolutions = useMemo(
    () =>
      resolutions.filter(
        (resolution) => resolution.kind === 'unresolved',
      ),
    [resolutions],
  );

  const unresolvedMethodNames = useMemo(
    () =>
      unresolvedResolutions.map(
        (resolution) => resolution.importedCustomMethod.name,
      ),
    [unresolvedResolutions],
  );

  const isResolved = unresolvedResolutions.length === 0;

  const buildResolutions = (
    payload: Record<string, unknown>,
    scenarios: ScenarioResponse[],
    previousResolutions: ScenarioCustomMethodResolution[] = [],
  ): ScenarioCustomMethodResolution[] => {
    const importedCustomMethods =
      parseImportedScenarioCustomMethods(payload);

    return createScenarioCustomMethodResolutions(
      importedCustomMethods,
      scenarios,
      previousResolutions,
    );
  };

  const initialize = (
    payload: Record<string, unknown>,
    scenarios: ScenarioResponse[],
  ): ScenarioCustomMethodResolution[] => {
    const nextResolutions = buildResolutions(payload, scenarios);

    setAvailableScenarios(scenarios);
    setResolutions(nextResolutions);
    setIsMissingModalOpen(
      nextResolutions.some(
        (resolution) => resolution.kind === 'unresolved',
      ),
    );

    return nextResolutions;
  };

  const initializeFromApi = async (
  payload: Record<string, unknown>,
): Promise<ScenarioCustomMethodResolution[]> => {
  try {
    setIsLoading(true);

    const { data: scenarios } = await http.get<
      ScenarioResponse[]
    >('/scenarios');

    return initialize(payload, scenarios);
  } finally {
    setIsLoading(false);
  }
};

  const refresh = async (
    payload: Record<string, unknown>,
  ): Promise<void> => {
    try {
      setIsLoading(true);

      const { data: scenarios } = await http.get<
        ScenarioResponse[]
      >('/scenarios');

      setAvailableScenarios(scenarios);

setResolutions((currentResolutions) => {
  const nextResolutions = buildResolutions(
    payload,
    scenarios,
    currentResolutions,
  );

  setIsMissingModalOpen(
    nextResolutions.some(
      (resolution) => resolution.kind === 'unresolved',
    ),
  );

  return nextResolutions;
});
    } finally {
      setIsLoading(false);
    }
  };

  const selectScenario = (
    importedCustomMethodName: string,
    scenarioId: number,
  ) => {
    const selectedScenario = availableScenarios.find(
      (scenario) => scenario.id === scenarioId,
    );

    if (!selectedScenario) {
      return;
    }

    setResolutions((currentResolutions) => {
      const nextResolutions = currentResolutions.map(
        (resolution) => {
          if (
            resolution.importedCustomMethod.name !==
            importedCustomMethodName
          ) {
            return resolution;
          }

          return {
            ...resolution,
            targetScenario: selectedScenario,
            kind: 'selected-existing' as const,
          };
        },
      );

      const hasUnresolved = nextResolutions.some(
        (resolution) => resolution.kind === 'unresolved',
      );

      if (!hasUnresolved) {
        setIsMissingModalOpen(false);
      }

      return nextResolutions;
    });
  };

  const closeMissingModal = () => {
    setIsMissingModalOpen(false);
  };

  const openScenarioCreateInNewTab = () => {
    window.open('/scenarios/new', '_blank', 'noopener,noreferrer');
  };

  const reset = () => {
    setAvailableScenarios([]);
    setResolutions([]);
    setIsLoading(false);
    setIsMissingModalOpen(false);
  };

  return {
    availableScenarios,
    resolutions,
    isLoading,
    isMissingModalOpen,
    unresolvedResolutions,
    unresolvedMethodNames,
    isResolved,
    initialize,
	initializeFromApi,
    refresh,
    selectScenario,
    closeMissingModal,
    openScenarioCreateInNewTab,
    reset,
  };
}
