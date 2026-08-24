package ru.paranomum.test_recorder.back.dto.scenarios;

import java.time.LocalDateTime;

public record ScenarioResponse(
		Long id,
		String name,
		String description,
		String scenarioPayloadJson,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
) {
}