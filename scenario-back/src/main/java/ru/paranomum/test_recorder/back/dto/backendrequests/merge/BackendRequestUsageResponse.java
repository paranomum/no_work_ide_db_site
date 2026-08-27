package ru.paranomum.test_recorder.back.dto.backendrequests.merge;

import java.util.List;

public record BackendRequestUsageResponse(
		Long backendRequestId,
		String backendRequestName,
		List<BackendRequestUsageScenarioResponse> scenarios
) {
}