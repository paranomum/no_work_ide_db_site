package ru.paranomum.test_recorder.back.dto.scenarios;

public record ScenarioDownloadResult(
		String fileName,
		String content
) {
}