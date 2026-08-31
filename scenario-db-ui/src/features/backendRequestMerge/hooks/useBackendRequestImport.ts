import { useRef, useState } from 'react';

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
  isResolved: boolean;
  resolvedCount: number;
  activeConflict: BackendRequestDto | null;
  existingConflictRequest: BackendRequestDto | null;
  initialize: (
  importedRequests: BackendRequestDto[],
  existingRequests?: BackendRequestDto[],
) => BackendRequestImportState;
  reset: () => void;
  useExisting: () => BackendRequestImportState | null;
  renameImported: () => {
    nextState: BackendRequestImportState;
    nextName: string;
  } | null;
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

export function useBackendRequestImport({
  existingBackendRequests,
}: UseBackendRequestImportParams): UseBackendRequestImportResult {
  const [state, setState] = useState<BackendRequestImportState>(
    initialBackendImportState,
  );

  const [isMergeWorkspaceOpen, setIsMergeWorkspaceOpen] =
    useState(false);

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

  return nextState;
};

  const reset = () => {
  existingRequestsRef.current = [];
  setState(initialBackendImportState);
  setIsMergeWorkspaceOpen(false);
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

    return nextState;
  };

  const useExisting = (): BackendRequestImportState | null => {
    const activeConflict = state.activeConflict;
    const existingConflictRequest =
      state.existingConflictRequest;

    if (!activeConflict || !existingConflictRequest) {
      return null;
    }

    return resolve({
      importedRequest: activeConflict,
      resolvedRequest: existingConflictRequest,
      kind: 'existing',
    });
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

  const openMergeWorkspace = () => {
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
    isResolved,
    resolvedCount,
    activeConflict: state.activeConflict,
    existingConflictRequest: state.existingConflictRequest,
    initialize,
    reset,
    useExisting,
    renameImported,
    openMergeWorkspace,
    closeMergeWorkspace,
    saveMerged,
    replaceResolutions,
  };
}
