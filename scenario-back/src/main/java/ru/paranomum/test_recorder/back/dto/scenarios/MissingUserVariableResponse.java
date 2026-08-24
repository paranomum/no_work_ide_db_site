package ru.paranomum.test_recorder.back.dto.scenarios;

public record MissingUserVariableResponse(
		Long variableId,
		String name,
		String description
) {
}