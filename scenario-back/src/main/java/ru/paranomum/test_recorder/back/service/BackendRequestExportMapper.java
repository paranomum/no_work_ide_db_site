package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;
import ru.paranomum.test_recorder.back.entity.BackendRequest;

@Component
public class BackendRequestExportMapper {

	private final ObjectMapper objectMapper;

	public BackendRequestExportMapper(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public ObjectNode toJson(BackendRequest backendRequest) {
		ObjectNode result = objectMapper.createObjectNode();

		result.put("name", backendRequest.getName());
		result.put("url", backendRequest.getUrl());
		result.put("method", backendRequest.getHttpMethod());

		putNullable(
				result,
				"requestBody",
				backendRequest.getRequestBody()
		);

		result.put(
				"requestHeaders",
				backendRequest.getRequestHeadersJson()
		);

		putNullable(
				result,
				"capturedResponseBody",
				backendRequest.getCapturedResponseBody()
		);

		result.set(
				"responseExtractors",
				parseJsonArray(
						backendRequest.getResponseExtractorsJson(),
						"responseExtractorsJson"
				)
		);

		result.set(
				"fieldOverrides",
				parseJsonArray(
						backendRequest.getFieldOverridesJson(),
						"fieldOverridesJson"
				)
		);

		result.put("token", backendRequest.getToken());
		result.put("bodyType", backendRequest.getBodyType());

		result.set(
				"formData",
				parseJsonArray(
						backendRequest.getFormDataJson(),
						"formDataJson"
				)
		);

		return result;
	}

	private void putNullable(
			ObjectNode node,
			String fieldName,
			String value
	) {
		if (value == null) {
			node.putNull(fieldName);
			return;
		}

		node.put(fieldName, value);
	}

	private ArrayNode parseJsonArray(
			String json,
			String fieldName
	) {
		JsonNode node = parseJson(json, fieldName);

		if (!node.isArray()) {
			throw new IllegalStateException(
					"Backend-запрос содержит невалидный %s"
							.formatted(fieldName)
			);
		}

		return (ArrayNode) node;
	}

	private JsonNode parseJson(String json, String fieldName) {
		try {
			return objectMapper.readTree(json);
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException(
					"Backend-запрос содержит невалидный JSON в поле %s"
							.formatted(fieldName),
					exception
			);
		}
	}
}