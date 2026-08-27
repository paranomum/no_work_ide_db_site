package ru.paranomum.test_recorder.back.dto.backendrequests;

public record BackendRequestResponse(
		Long id,
		String name,
		String url,
		String httpMethod,
		String requestBody,
		String requestHeadersJson,
		String capturedResponseBody,
		String token,
		String bodyType,
		String formDataJson,
		String fieldOverridesJson,
		String responseExtractorsJson
) {
}