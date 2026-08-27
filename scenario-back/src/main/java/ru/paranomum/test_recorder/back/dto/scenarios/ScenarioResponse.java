package ru.paranomum.test_recorder.back.dto.scenarios;

import ru.paranomum.test_recorder.back.dto.tags.TagResponse;

import java.time.LocalDateTime;
import java.util.List;

public record ScenarioResponse(
		Long id,
		String name,
		String description,
		String scenarioPayloadJson,
		List<TagResponse> tags
) {
}