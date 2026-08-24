package ru.paranomum.test_recorder.back.dto.scenarios;

public record ScenarioBackendRequestResponse(
		Long backendRequestId,
		String name,
		String url,
		String httpMethod
) {
}