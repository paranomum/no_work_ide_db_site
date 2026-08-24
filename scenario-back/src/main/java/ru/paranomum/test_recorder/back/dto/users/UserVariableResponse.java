package ru.paranomum.test_recorder.back.dto.users;

public record UserVariableResponse(
		Long variableId,
		String name,
		String description,
		String value,
		boolean isSet
) {
}