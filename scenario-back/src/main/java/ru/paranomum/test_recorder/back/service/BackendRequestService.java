package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestResponse;
import ru.paranomum.test_recorder.back.entity.BackendRequest;
import ru.paranomum.test_recorder.back.exception.BackendRequestAlreadyExistsException;
import ru.paranomum.test_recorder.back.exception.BackendRequestJsonInvalidException;
import ru.paranomum.test_recorder.back.repository.BackendRequestRepository;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class BackendRequestService {

	private static final String DEFAULT_HEADERS_JSON = "{}";
	private static final String DEFAULT_ARRAY_JSON = "[]";
	private static final String DEFAULT_BODY_TYPE = "NONE";

	private final BackendRequestRepository backendRequestRepository;
	private final ObjectMapper objectMapper;

	public BackendRequestService(
			BackendRequestRepository backendRequestRepository,
			ObjectMapper objectMapper
	) {
		this.backendRequestRepository = backendRequestRepository;
		this.objectMapper = objectMapper;
	}

	public List<BackendRequestResponse> getAll(String query) {
		List<BackendRequest> backendRequests = query == null || query.isBlank()
				? backendRequestRepository.findAllByOrderByNameAsc()
				: backendRequestRepository
				.findAllByNameContainingIgnoreCaseOrderByNameAsc(
						query.trim()
				);

		return backendRequests.stream()
				.map(this::toResponse)
				.toList();
	}

	public BackendRequestResponse getById(Long id) {
		return toResponse(findById(id));
	}

	@Transactional
	public BackendRequestResponse create(BackendRequestRequest request) {
		BackendRequestData data = prepareData(request);

		if (backendRequestRepository.existsByNameIgnoreCase(data.name())) {
			throw new BackendRequestAlreadyExistsException(data.name());
		}

		try {
			BackendRequest backendRequest = backendRequestRepository.save(
					new BackendRequest(
							data.name(),
							data.url(),
							data.httpMethod(),
							data.requestBody(),
							data.requestHeadersJson(),
							data.capturedResponseBody(),
							data.token(),
							data.bodyType(),
							data.formDataJson(),
							data.fieldOverridesJson(),
							data.responseExtractorsJson(),
							data.capturedAt()
					)
			);

			return toResponse(backendRequest);
		} catch (DataIntegrityViolationException exception) {
			throw new BackendRequestAlreadyExistsException(data.name());
		}
	}

	@Transactional
	public BackendRequestResponse update(
			Long id,
			BackendRequestRequest request
	) {
		BackendRequest backendRequest = findById(id);
		BackendRequestData data = prepareData(request);

		boolean nameChanged = !backendRequest.getName()
				.equalsIgnoreCase(data.name());

		if (nameChanged
				&& backendRequestRepository.existsByNameIgnoreCase(data.name())) {
			throw new BackendRequestAlreadyExistsException(data.name());
		}

		try {
			backendRequest.update(
					data.name(),
					data.url(),
					data.httpMethod(),
					data.requestBody(),
					data.requestHeadersJson(),
					data.capturedResponseBody(),
					data.token(),
					data.bodyType(),
					data.formDataJson(),
					data.fieldOverridesJson(),
					data.responseExtractorsJson(),
					data.capturedAt()
			);

			return toResponse(backendRequest);
		} catch (DataIntegrityViolationException exception) {
			throw new BackendRequestAlreadyExistsException(data.name());
		}
	}

	@Transactional
	public void delete(Long id) {
		backendRequestRepository.delete(findById(id));
	}

	@Transactional
	public List<BackendRequestResponse> createBatch(
			List<BackendRequestRequest> requests
	) {
		return requests.stream()
				.map(this::createIfAbsent)
				.filter(Objects::nonNull)
				.map(this::toResponse)
				.toList();
	}

	private BackendRequest findById(Long id) {
		return backendRequestRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Backend-запрос с id=%d не найден".formatted(id)
				));
	}

	private BackendRequestData prepareData(BackendRequestRequest request) {
		return new BackendRequestData(
				normalizeRequired(request.name()),
				normalizeRequired(request.url()),
				normalizeHttpMethod(request.httpMethod()),
				normalizeNullable(request.requestBody()),
				normalizeJsonObject(
						request.requestHeadersJson(),
						DEFAULT_HEADERS_JSON,
						"requestHeadersJson"
				),
				normalizeNullable(request.capturedResponseBody()),
				normalizeNullableToEmpty(request.token()),
				normalizeBodyType(request.bodyType()),
				normalizeJsonArray(
						request.formDataJson(),
						"formDataJson"
				),
				normalizeJsonArray(
						request.fieldOverridesJson(),
						"fieldOverridesJson"
				),
				normalizeJsonArray(
						request.responseExtractorsJson(),
						"responseExtractorsJson"
				),
				normalizeNullable(request.capturedAt())
		);
	}

	private String normalizeRequired(String value) {
		return value.trim();
	}

	private String normalizeNullable(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}

		return value.trim();
	}

	private String normalizeNullableToEmpty(String value) {
		return value == null ? "" : value.trim();
	}

	private String normalizeHttpMethod(String value) {
		return normalizeRequired(value).toUpperCase(Locale.ROOT);
	}

	private String normalizeBodyType(String value) {
		if (value == null || value.isBlank()) {
			return DEFAULT_BODY_TYPE;
		}

		return value.trim().toUpperCase(Locale.ROOT);
	}

	private String normalizeJsonObject(
			String value,
			String defaultValue,
			String fieldName
	) {
		String json = value == null || value.isBlank()
				? defaultValue
				: value.trim();

		JsonNode node = readJson(json, fieldName);

		if (!node.isObject()) {
			throw new BackendRequestJsonInvalidException(fieldName);
		}

		return node.toString();
	}

	private String normalizeJsonArray(String value, String fieldName) {
		String json = value == null || value.isBlank()
				? DEFAULT_ARRAY_JSON
				: value.trim();

		JsonNode node = readJson(json, fieldName);

		if (!node.isArray()) {
			throw new BackendRequestJsonInvalidException(fieldName);
		}

		return node.toString();
	}

	private JsonNode readJson(String json, String fieldName) {
		try {
			return objectMapper.readTree(json);
		} catch (JsonProcessingException exception) {
			throw new BackendRequestJsonInvalidException(fieldName);
		}
	}

	private BackendRequestResponse toResponse(BackendRequest backendRequest) {
		return new BackendRequestResponse(
				backendRequest.getId(),
				backendRequest.getName(),
				backendRequest.getUrl(),
				backendRequest.getHttpMethod(),
				backendRequest.getRequestBody(),
				backendRequest.getRequestHeadersJson(),
				backendRequest.getCapturedResponseBody(),
				backendRequest.getToken(),
				backendRequest.getBodyType(),
				backendRequest.getFormDataJson(),
				backendRequest.getFieldOverridesJson(),
				backendRequest.getResponseExtractorsJson(),
				backendRequest.getCapturedAt(),
				backendRequest.getCreatedAt(),
				backendRequest.getUpdatedAt()
		);
	}

	private record BackendRequestData(
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
			String responseExtractorsJson,
			String capturedAt
	) {
	}

	private BackendRequest createIfAbsent(
			BackendRequestRequest request
	) {
		BackendRequestData data = prepareData(request);

		if (backendRequestRepository.existsByNameIgnoreCase(data.name())) {
			return null;
		}

		try {
			return backendRequestRepository.save(
					new BackendRequest(
							data.name(),
							data.url(),
							data.httpMethod(),
							data.requestBody(),
							data.requestHeadersJson(),
							data.capturedResponseBody(),
							data.token(),
							data.bodyType(),
							data.formDataJson(),
							data.fieldOverridesJson(),
							data.responseExtractorsJson(),
							data.capturedAt()
					)
			);
		} catch (DataIntegrityViolationException exception) {
			/*
			 * Возможна гонка: два потока одновременно увидели, что имени ещё
			 * нет. UNIQUE(name) в БД остаётся финальной защитой. Для bulk
			 * импорта такой конфликт означает «его уже успели создать»,
			 * поэтому пропускаем.
			 */
			return null;
		}
	}
}