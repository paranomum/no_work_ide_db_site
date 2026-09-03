package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestResponse;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.BackendRequestMergeRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.BackendRequestUsageResponse;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.BackendRequestUsageScenarioResponse;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.ScenarioVariableMigrationRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.ScenarioVariableMigrationValueRequest;
import ru.paranomum.test_recorder.back.entity.BackendRequest;
import ru.paranomum.test_recorder.back.entity.Scenario;
import ru.paranomum.test_recorder.back.entity.ScenarioBackendRequest;
import ru.paranomum.test_recorder.back.entity.ScenarioVariable;
import ru.paranomum.test_recorder.back.entity.ScenarioVariableId;
import ru.paranomum.test_recorder.back.entity.Variable;
import ru.paranomum.test_recorder.back.exception.BackendRequestAlreadyExistsException;
import ru.paranomum.test_recorder.back.exception.BackendRequestJsonInvalidException;
import ru.paranomum.test_recorder.back.exception.VariableAlreadyExistsException;
import ru.paranomum.test_recorder.back.repository.BackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioBackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioVariableRepository;
import ru.paranomum.test_recorder.back.repository.VariableRepository;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class BackendRequestService {

	private static final String DEFAULT_HEADERS_JSON = "{}";
	private static final String DEFAULT_ARRAY_JSON = "[]";
	private static final String DEFAULT_BODY_TYPE = "NONE";

	private final BackendRequestRepository backendRequestRepository;
	private final ScenarioBackendRequestRepository scenarioBackendRequestRepository;
	private final ScenarioRepository scenarioRepository;
	private final VariableRepository variableRepository;
	private final ScenarioVariableRepository scenarioVariableRepository;
	private final ObjectMapper objectMapper;

	public BackendRequestService(
			BackendRequestRepository backendRequestRepository,
			ScenarioBackendRequestRepository scenarioBackendRequestRepository,
			ScenarioRepository scenarioRepository,
			VariableRepository variableRepository,
			ScenarioVariableRepository scenarioVariableRepository,
			ObjectMapper objectMapper
	) {
		this.backendRequestRepository = backendRequestRepository;
		this.scenarioBackendRequestRepository =
				scenarioBackendRequestRepository;
		this.scenarioRepository = scenarioRepository;
		this.variableRepository = variableRepository;
		this.scenarioVariableRepository = scenarioVariableRepository;
		this.objectMapper = objectMapper;
	}

	public List<BackendRequestResponse> getAll(String query) {
		List<BackendRequest> backendRequests =
				query == null || query.isBlank()
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

	public BackendRequestUsageResponse getUsage(Long backendRequestId) {
		BackendRequest backendRequest = findById(backendRequestId);

		List<Long> scenarioIds = scenarioBackendRequestRepository
				.findAllByBackendRequestId(backendRequestId)
				.stream()
				.map(ScenarioBackendRequest::getScenarioId)
				.distinct()
				.toList();

		Map<Long, String> scenarioNamesById = scenarioRepository
				.findAllById(scenarioIds)
				.stream()
				.collect(Collectors.toMap(
						Scenario::getId,
						Scenario::getName
				));

		List<BackendRequestUsageScenarioResponse> scenarios =
				scenarioIds.stream()
						.map(scenarioId ->
								new BackendRequestUsageScenarioResponse(
										scenarioId,
										scenarioNamesById.get(scenarioId)
								)
						)
						.toList();

		return new BackendRequestUsageResponse(
				backendRequest.getId(),
				backendRequest.getName(),
				scenarios
		);
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
							data.responseExtractorsJson()
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
			updateBackendRequest(backendRequest, data);
			return toResponse(backendRequest);
		} catch (DataIntegrityViolationException exception) {
			throw new BackendRequestAlreadyExistsException(data.name());
		}
	}

	@Transactional
	public BackendRequestResponse mergeForScenarioImport(
			Long backendRequestId,
			BackendRequestMergeRequest request
	) {
		return merge(backendRequestId, request);
	}

	@Transactional
	public BackendRequestResponse merge(
			Long backendRequestId,
			BackendRequestMergeRequest request
	) {
		BackendRequest backendRequest = findById(backendRequestId);
		BackendRequestData data = prepareData(request.backendRequest());

		String previousName = backendRequest.getName();
		boolean nameChanged = !previousName.equalsIgnoreCase(data.name());

		validateMergeName(backendRequest, data.name());

		Set<Long> linkedScenarioIds = scenarioBackendRequestRepository
				.findAllByBackendRequestId(backendRequestId)
				.stream()
				.map(ScenarioBackendRequest::getScenarioId)
				.collect(Collectors.toSet());

		if (nameChanged) {
			renameBackendMethodInLinkedScenarioPayloads(
					linkedScenarioIds,
					previousName,
					data.name()
			);
		}

		validateAndApplyVariableMigrations(
				request.scenarioVariableMigrations(),
				linkedScenarioIds
		);

		updateBackendRequest(backendRequest, data);

		return toResponse(backendRequest);
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

	private void renameBackendMethodInLinkedScenarioPayloads(
			Set<Long> scenarioIds,
			String previousName,
			String updatedName
	) {
		if (scenarioIds.isEmpty()) {
			return;
		}

		List<Scenario> scenarios = scenarioRepository.findAllById(
				scenarioIds
		);

		for (Scenario scenario : scenarios) {
			ObjectNode root = parseScenarioPayload(
					scenario.getScenarioPayloadJson()
			);

			boolean changed = replaceBackendMethodActionReferences(
					root,
					previousName,
					updatedName
			);

			changed = renameScenarioOverrideKey(
					root,
					previousName,
					updatedName
			) || changed;

			if (changed) {
				scenario.update(
						scenario.getName(),
						scenario.getDescription(),
						serializeScenarioPayload(root)
				);
			}
		}
	}

	private boolean replaceBackendMethodActionReferences(
			ObjectNode root,
			String previousName,
			String updatedName
	) {
		JsonNode actionsNode = root.get("actions");

		if (actionsNode == null || !actionsNode.isArray()) {
			return false;
		}

		boolean changed = false;

		for (JsonNode actionNode : actionsNode) {
			if (!actionNode.isObject()) {
				continue;
			}

			ObjectNode action = (ObjectNode) actionNode;

			if (!"useBackendMethod".equals(
					action.path("action").asText()
			)) {
				continue;
			}

			if (!previousName.equals(action.path("value").asText())) {
				continue;
			}

			action.put("value", updatedName);
			changed = true;
		}

		return changed;
	}

	private boolean renameScenarioOverrideKey(
			ObjectNode root,
			String previousName,
			String updatedName
	) {
		JsonNode scenarioOverridesNode = root.get("scenarioOverrides");

		if (
				scenarioOverridesNode == null
						|| !scenarioOverridesNode.isObject()
		) {
			return false;
		}

		ObjectNode scenarioOverrides =
				(ObjectNode) scenarioOverridesNode;

		JsonNode override = scenarioOverrides.remove(previousName);

		if (override == null) {
			return false;
		}

		scenarioOverrides.set(updatedName, override);

		return true;
	}

	private ObjectNode parseScenarioPayload(String payload) {
		try {
			JsonNode root = objectMapper.readTree(payload);

			if (root == null || !root.isObject()) {
				throw new IllegalStateException(
						"Сценарий содержит невалидный JSON payload"
				);
			}

			return (ObjectNode) root;
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException(
					"Сценарий содержит невалидный JSON payload",
					exception
			);
		}
	}

	private String serializeScenarioPayload(ObjectNode root) {
		try {
			return objectMapper.writeValueAsString(root);
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException(
					"Не удалось сериализовать JSON payload сценария",
					exception
			);
		}
	}

	private void validateAndApplyVariableMigrations(
			List<ScenarioVariableMigrationRequest> migrations,
			Set<Long> linkedScenarioIds
	) {
		if (migrations == null || migrations.isEmpty()) {
			return;
		}

		Set<String> migrationVariableNames = new HashSet<>();

		/*
		 * Храним следующую свободную position в памяти для каждого
		 * сценария только в пределах текущего merge.
		 *
		 * Это предотвращает выдачу одинаковой position нескольким
		 * новым ScenarioVariable до того, как Hibernate выполнит flush.
		 */
		Map<Long, Integer> nextVariablePositionByScenarioId =
				new HashMap<>();

		for (ScenarioVariableMigrationRequest migration : migrations) {
			String normalizedVariableName = normalizeRequired(
					migration.variable().name()
			);

			String variableKey = normalizedVariableName
					.toLowerCase(Locale.ROOT);

			if (!migrationVariableNames.add(variableKey)) {
				throw new IllegalArgumentException(
						"Переменная %s указана в миграции несколько раз"
								.formatted(migration.variable().name())
				);
			}

			Map<Long, String> valuesByScenarioId = migration
					.scenarioValues()
					.stream()
					.collect(Collectors.toMap(
							ScenarioVariableMigrationValueRequest::scenarioId,
							ScenarioVariableMigrationValueRequest::defaultValue,
							(first, second) -> {
								throw new IllegalArgumentException(
										"Для одного сценария указано несколько "
												+ "значений одной переменной"
								);
							}
					));

			if (!valuesByScenarioId.keySet().equals(linkedScenarioIds)) {
				throw new IllegalArgumentException(
						"Для переменной %s нужно указать значение для каждого "
								+ "сценария, использующего backend-метод"
								.formatted(migration.variable().name())
				);
			}

			Variable variable = findOrCreateVariable(migration);

			for (Map.Entry<Long, String> valueEntry
					: valuesByScenarioId.entrySet()) {
				upsertScenarioVariable(
						valueEntry.getKey(),
						variable,
						valueEntry.getValue(),
						nextVariablePositionByScenarioId
				);
			}
		}
	}

	private Variable findOrCreateVariable(
			ScenarioVariableMigrationRequest migration
	) {
		String variableName = normalizeRequired(
				migration.variable().name()
		);
		String variableDescription = normalizeNullable(
				migration.variable().description()
		);
		boolean isUserVariable = migration.variable().isUserVariable();

		return variableRepository.findByNameIgnoreCase(variableName)
				.map(existingVariable -> {
					if (
							existingVariable.isUserVariable()
									!= isUserVariable
					) {
						throw new IllegalArgumentException(
								"Тип переменной %s не совпадает с уже "
										+ "существующей переменной"
										.formatted(variableName)
						);
					}

					return existingVariable;
				})
				.orElseGet(() -> {
					try {
						return variableRepository.saveAndFlush(
								new Variable(
										variableName,
										variableDescription,
										isUserVariable
								)
						);
					} catch (DataIntegrityViolationException exception) {
						return variableRepository
								.findByNameIgnoreCase(variableName)
								.orElseThrow(() -> new VariableAlreadyExistsException(
										variableName
								));
					}
				});
	}

	private void upsertScenarioVariable(
			Long scenarioId,
			Variable variable,
			String defaultValue,
			Map<Long, Integer> nextVariablePositionByScenarioId
	) {
		ScenarioVariableId id = new ScenarioVariableId(
				scenarioId,
				variable.getId()
		);

		scenarioVariableRepository.findById(id)
				.ifPresentOrElse(
						scenarioVariable -> scenarioVariable.updateDefaultValue(
								defaultValue
						),
						() -> {
							int nextPosition =
									nextVariablePositionByScenarioId.computeIfAbsent(
											scenarioId,
											this::findNextScenarioVariablePosition
									);

							scenarioVariableRepository.save(
									new ScenarioVariable(
											scenarioId,
											variable.getId(),
											defaultValue,
											nextPosition
									)
							);

							nextVariablePositionByScenarioId.put(
									scenarioId,
									nextPosition + 1
							);
						}
				);
	}

	private Integer findNextScenarioVariablePosition(Long scenarioId) {
		return scenarioVariableRepository
				.findAllByScenarioIdOrderByPositionAsc(scenarioId)
				.stream()
				.map(ScenarioVariable::getPosition)
				.max(Integer::compareTo)
				.map(position -> position + 1)
				.orElse(0);
	}

	private void validateMergeName(
			BackendRequest backendRequest,
			String updatedName
	) {
		boolean nameChanged = !backendRequest.getName()
				.equalsIgnoreCase(updatedName);

		if (nameChanged
				&& backendRequestRepository.existsByNameIgnoreCase(
				updatedName
		)) {
			throw new BackendRequestAlreadyExistsException(updatedName);
		}
	}

	private void updateBackendRequest(
			BackendRequest backendRequest,
			BackendRequestData data
	) {
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
				data.responseExtractorsJson()
		);
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
				)
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

	private BackendRequestResponse toResponse(
			BackendRequest backendRequest
	) {
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
				backendRequest.getResponseExtractorsJson()
		);
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
							data.responseExtractorsJson()
					)
			);
		} catch (DataIntegrityViolationException exception) {
			return null;
		}
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
			String responseExtractorsJson
	) {
	}
}