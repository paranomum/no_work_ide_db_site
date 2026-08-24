package ru.paranomum.test_recorder.back.dto.scenarios;

public record ScenarioVariableResponse(
		Long variableId,
		String name,
		String description,
		boolean isUserVariable,
		Integer position
) {
}