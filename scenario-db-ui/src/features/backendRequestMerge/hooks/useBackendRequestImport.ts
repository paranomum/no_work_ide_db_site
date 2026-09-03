import {
  useRef,
  useState,
} from 'react';


import {
  createBackendRequestImportState,
  getNextAvailableMethodName,
  resolveBackendRequestConflict,
} from '../model/backendRequestImportPlan';
import type {
  BackendRequestImportState,
  BackendRequestMergeDraft,
  BackendRequestResolution,
} from '../model/backendRequestImport.types';
import type {
  BackendRequestDto,
  ScenarioVariableMigration,
  UseExistingBackendRequestDraft,
  UseExistingVariableDecision,
  UseExistingVariableIssue,
} from '../model/backendRequestMerge.types';


const initialBackendImportState: BackendRequestImportState = {
  resolutions: [],
  pendingConflicts: [],
  activeConflict: null,
  existingConflictRequest: null,
};


interface UseBackendRequestImportParams {
  existingBackendRequests: BackendRequestDto[];
}


interface UseBackendRequestImportResult {
  state: BackendRequestImportState;
  isMergeWorkspaceOpen: boolean;
  isUseExistingWorkspaceOpen: boolean;
  isResolved: boolean;
  resolvedCount: number;
  activeConflict: BackendRequestDto | null;
  existingConflictRequest: BackendRequestDto | null;
  initialize: (
    importedRequests: BackendRequestDto[],
    existingRequests?: BackendRequestDto[],
  ) => BackendRequestImportState;
  reset: () => void;
  renameImported: () => {
    nextState: BackendRequestImportState;
    nextName: string;
  } | null;
  openUseExistingWorkspace: () => void;
  closeUseExistingWorkspace: () => void;
  saveUseExisting: (
    draft: UseExistingBackendRequestDraft,
  ) => BackendRequestImportState | null;
  openMergeWorkspace: () => void;
  closeMergeWorkspace: () => void;
  saveMerged: (
    mergeDraft: BackendRequestMergeDraft,
  ) => BackendRequestImportState | null;
  replaceResolutions: (
    update: (
      resolutions: BackendRequestResolution[],
    ) => BackendRequestResolution[],
  ) => void;
}


function getIssueById(
  issues: UseExistingVariableIssue[],
  issueId: string,
): UseExistingVariableIssue {
  const issue = issues.find((item) => item.id === issueId);

  if (!issue) {
    throw new Error(
      `Не найдена переменная для решения: ${issueId}`,
    );
  }

  return issue;
}


function createMigration(
  issue: UseExistingVariableIssue,
  defaultValue: string,
): ScenarioVariableMigration {
  return {
    variable: {
      name: issue.requiredVariableName,
      description: '',
      isUserVariable: false,
    },
    scenarioValues: [],
    importedScenarioDefaultValue: defaultValue,
  };
}


function getMigrationsFromDecision(
  decision: UseExistingVariableDecision,
  issues: UseExistingVariableIssue[],
): ScenarioVariableMigration[] {
  const issue = getIssueById(issues, decision.issueId);

  if (decision.kind === 'keep-existing') {
    return [];
  }

  if (decision.kind === 'create-new') {
    const defaultValue =
      decision.newVariableDefaultValue.trim();

    if (!defaultValue) {
      throw new Error(
        `Не заполнено значение переменной «${issue.requiredVariableName}»`,
      );
    }

    return [createMigration(issue, defaultValue)];
  }

  if (decision.kind === 'auto-create-extractor') {
    if (issue.variableKind !== 'response-extractor') {
      throw new Error(
        `Переменная «${issue.requiredVariableName}» не является response extractor`,
      );
    }

    const defaultValue = issue.suggestedDefaultValue.trim();

    if (!defaultValue) {
      throw new Error(
        `Не удалось определить значение extractor-переменной «${issue.requiredVariableName}»`,
      );
    }

    return [createMigration(issue, defaultValue)];
  }

  if (
    decision.kind ===
    'rename-existing-and-create-new'
  ) {
    const defaultValue =
      decision.newVariableDefaultValue.trim();

    if (!defaultValue) {
      throw new Error(
        `Не заполнено значение новой переменной «${issue.requiredVariableName}»`,
      );
    }

    return [createMigration(issue, defaultValue)];
  }

  return [];
}


function createUseExistingMigrations(
  draft: UseExistingBackendRequestDraft,
): ScenarioVariableMigration[] {
  const migrations = draft.decisions.flatMap((decision) =>
    getMigrationsFromDecision(decision, draft.issues),
  );

  const names = new Set<string>();

  migrations.forEach((migration) => {
    const name = migration.variable.name
      .trim()
      .toLocaleLowerCase('ru-RU');

    if (!name) {
      throw new Error('Не задано имя переменной');
    }

    if (names.has(name)) {
      throw new Error(
        `Переменная «${migration.variable.name}» добавлена несколько раз`,
      );
    }

    names.add(name);
  });

  return migrations;
}


export function useBackendRequestImport({
  existingBackendRequests,
}: UseBackendRequestImportParams): UseBackendRequestImportResult {
  const [state, setState] = useState<BackendRequestImportState>(
    initialBackendImportState,
  );

  const [isMergeWorkspaceOpen, setIsMergeWorkspaceOpen] =
    useState(false);

  const [
    isUseExistingWorkspaceOpen,
    setIsUseExistingWorkspaceOpen,
  ] = useState(false);

  const existingRequestsRef = useRef<BackendRequestDto[]>(
    existingBackendRequests,
  );

  const isResolved =
    state.pendingConflicts.length === 0 &&
    state.activeConflict === null;

  const resolvedCount = state.resolutions.length;


  const initialize = (
    importedRequests: BackendRequestDto[],
    existingRequests = existingBackendRequests,
  ): BackendRequestImportState => {
    existingRequestsRef.current = existingRequests;

    const nextState = createBackendRequestImportState(
      importedRequests,
      existingRequests,
    );

    setState(nextState);
    setIsMergeWorkspaceOpen(false);
    setIsUseExistingWorkspaceOpen(false);

    return nextState;
  };


  const reset = () => {
    existingRequestsRef.current = [];
    setState(initialBackendImportState);
    setIsMergeWorkspaceOpen(false);
    setIsUseExistingWorkspaceOpen(false);
  };


  const resolve = (
    resolution: BackendRequestResolution,
  ): BackendRequestImportState | null => {
    if (!state.activeConflict) {
      return null;
    }

    const nextState = resolveBackendRequestConflict(
      state,
      resolution,
      existingRequestsRef.current,
    );

    setState(nextState);
    setIsMergeWorkspaceOpen(false);
    setIsUseExistingWorkspaceOpen(false);

    return nextState;
  };


  const renameImported = (): {
    nextState: BackendRequestImportState;
    nextName: string;
  } | null => {
    const activeConflict = state.activeConflict;

    if (!activeConflict) {
      return null;
    }

    const nextName = getNextAvailableMethodName(
      activeConflict.name,
      existingRequestsRef.current,
      state.resolutions,
    );

    const nextState = resolve({
      importedRequest: activeConflict,
      resolvedRequest: {
        ...activeConflict,
        name: nextName,
      },
      kind: 'renamed',
    });

    if (!nextState) {
      return null;
    }

    return {
      nextState,
      nextName,
    };
  };


  const openUseExistingWorkspace = () => {
    if (
      !state.activeConflict ||
      !state.existingConflictRequest
    ) {
      return;
    }

    setIsMergeWorkspaceOpen(false);
    setIsUseExistingWorkspaceOpen(true);
  };


  const closeUseExistingWorkspace = () => {
    setIsUseExistingWorkspaceOpen(false);
  };


  const saveUseExisting = (
    draft: UseExistingBackendRequestDraft,
  ): BackendRequestImportState | null => {
    const activeConflict = state.activeConflict;
    const existingConflictRequest =
      state.existingConflictRequest;

    if (!activeConflict || !existingConflictRequest) {
      return null;
    }

    if (
      typeof existingConflictRequest.id !== 'number' ||
      existingConflictRequest.id !== draft.existingBackendRequestId
    ) {
      throw new Error(
        'Изменился существующий backend-метод для разрешения конфликта',
      );
    }

    if (
      activeConflict.name !== draft.importedBackendRequestName
    ) {
      throw new Error(
        'Изменился импортируемый backend-метод для разрешения конфликта',
      );
    }

    return resolve({
      importedRequest: activeConflict,
      resolvedRequest: existingConflictRequest,
      kind: 'existing',
      useExistingDraft: {
        scenarioVariableMigrations:
          createUseExistingMigrations(draft),
      },
    });
  };


  const openMergeWorkspace = () => {
    if (!state.activeConflict) {
      return;
    }

    setIsUseExistingWorkspaceOpen(false);
    setIsMergeWorkspaceOpen(true);
  };


  const closeMergeWorkspace = () => {
    setIsMergeWorkspaceOpen(false);
  };


  const saveMerged = (
    mergeDraft: BackendRequestMergeDraft,
  ): BackendRequestImportState | null => {
    const activeConflict = state.activeConflict;

    if (!activeConflict) {
      return null;
    }

    return resolve({
      importedRequest: activeConflict,
      resolvedRequest: mergeDraft.mergedRequest,
      kind: 'merged',
      mergeDraft,
    });
  };


  const replaceResolutions = (
    update: (
      resolutions: BackendRequestResolution[],
    ) => BackendRequestResolution[],
  ) => {
    setState((currentState) => ({
      ...currentState,
      resolutions: update(currentState.resolutions),
    }));
  };


  return {
    state,
    isMergeWorkspaceOpen,
    isUseExistingWorkspaceOpen,
    isResolved,
    resolvedCount,
    activeConflict: state.activeConflict,
    existingConflictRequest: state.existingConflictRequest,
    initialize,
    reset,
    renameImported,
    openUseExistingWorkspace,
    closeUseExistingWorkspace,
    saveUseExisting,
    openMergeWorkspace,
    closeMergeWorkspace,
    saveMerged,
    replaceResolutions,
  };
}
