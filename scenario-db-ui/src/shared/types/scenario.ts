export interface TagResponse {
  id: number;
  name: string;
  color: string;
}

export interface ScenarioListItem {
  id: string;
  name: string;
  tags: string[];
}

export interface ScenarioResponse {
  id: number;
  name: string;
  description: string | null;
  scenarioPayloadJson: string;
  tags: TagResponse[];
}

export interface ScenarioRequest {
  name: string;
  description: string;
  scenarioPayloadJson: string;
}

export interface ScenarioTagsRequest {
  tagIds: number[];
}

export interface UserVariableResponse {
  variableId: number;
  name: string;
  description: string | null;
  value: string | null;
  isSet: boolean;
}

export interface UserVariableRequest {
  value: string;
}

export interface ScenarioCustomMethodResponse {
  scenarioId: number;
  name: string;
  description: string | null;
}

export interface ScenarioCustomMethodsRequest {
  targetScenarioIds: number[];
}

export interface ScenarioBackendRequestResponse {
  backendRequestId: number;
  name: string;
  url: string;
  httpMethod: string;
}

export interface ScenarioBackendRequestsRequest {
  backendRequestIds: number[];
}

export interface ScenarioVariableResponse {
  variableId: number;
  name: string;
  description: string | null;
  isUserVariable: boolean;
  defaultValue: string;
  position: number;
}
