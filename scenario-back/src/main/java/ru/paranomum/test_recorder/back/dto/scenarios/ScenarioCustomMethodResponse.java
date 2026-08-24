package ru.paranomum.test_recorder.back.dto.scenarios;

public record ScenarioCustomMethodResponse(
		Long scenarioId,
		String name,
		String description
) {
}