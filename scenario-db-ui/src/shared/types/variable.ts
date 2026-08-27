export interface VariableDto {
  id: number;
  name: string;
  isUserVariable: boolean;
}

export interface CreateVariableRequest {
  name: string;
  isUserVariable: boolean;
}

export interface ScenarioVariableRequest {
  variableId: number;
  defaultValue: string;
  position: number;
}
