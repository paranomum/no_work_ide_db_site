package ru.paranomum.test_recorder.back.dto.variables;

import java.time.LocalDateTime;

public record VariableResponse(
		Long id,
		String name,
		String description,
		boolean isUserVariable
) {
}