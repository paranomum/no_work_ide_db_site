package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.scenarios.MissingUserVariableResponse;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioDownloadResult;
import ru.paranomum.test_recorder.back.entity.BackendRequest;
import ru.paranomum.test_recorder.back.entity.Scenario;
import ru.paranomum.test_recorder.back.entity.ScenarioBackendRequest;
import ru.paranomum.test_recorder.back.entity.ScenarioCustomMethod;
import ru.paranomum.test_recorder.back.entity.ScenarioVariable;
import ru.paranomum.test_recorder.back.entity.UserVariable;
import ru.paranomum.test_recorder.back.entity.Variable;
import ru.paranomum.test_recorder.back.exception.MissingUserVariablesException;
import ru.paranomum.test_recorder.back.repository.BackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioBackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioCustomMethodRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioVariableRepository;
import ru.paranomum.test_recorder.back.repository.UserVariableRepository;
import ru.paranomum.test_recorder.back.repository.VariableRepository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ScenarioExportService {

	private final ScenarioRepository scenarioRepository;
	private final ScenarioVariableRepository scenarioVariableRepository;
	private final VariableRepository variableRepository;
	private final UserVariableRepository userVariableRepository;
	private final ScenarioBackendRequestRepository
			scenarioBackendRequestRepository;
	private final BackendRequestRepository backendRequestRepository;
	private final ScenarioCustomMethodRepository
			scenarioCustomMethodRepository;
	private final BackendRequestExportMapper backendRequestExportMapper;
	private final ObjectMapper objectMapper;

	public ScenarioExportService(
			ScenarioRepository scenarioRepository,
			ScenarioVariableRepository scenarioVariableRepository,
			VariableRepository variableRepository,
			UserVariableRepository userVariableRepository,
			ScenarioBackendRequestRepository scenarioBackendRequestRepository,
			BackendRequestRepository backendRequestRepository,
			ScenarioCustomMethodRepository scenarioCustomMethodRepository,
			BackendRequestExportMapper backendRequestExportMapper,
			ObjectMapper objectMapper
	) {
		this.scenarioRepository = scenarioRepository;
		this.scenarioVariableRepository = scenarioVariableRepository;
		this.variableRepository = variableRepository;
		this.userVariableRepository = userVariableRepository;
		this.scenarioBackendRequestRepository =
				scenarioBackendRequestRepository;
		this.backendRequestRepository = backendRequestRepository;
		this.scenarioCustomMethodRepository =
				scenarioCustomMethodRepository;
		this.backendRequestExportMapper = backendRequestExportMapper;
		this.objectMapper = objectMapper;
	}

	public ScenarioDownloadResult downloadOriginal(
			Long scenarioId,
			Long userId
	) {
		Scenario scenario = findScenario(scenarioId);

		ObjectNode root = buildScenarioJson(scenarioId, userId);

		return new ScenarioDownloadResult(
				buildFileName(scenario.getName()),
				serializeJson(root)
		);
	}

	public List<ScenarioDownloadResult> downloadZipEntries(
			Long rootScenarioId,
			Long userId
	) {
		LinkedHashSet<Long> scenarioIds = new LinkedHashSet<>();

		collectScenarioIdsForZip(rootScenarioId, scenarioIds);

		validateUserVariablesForScenarios(scenarioIds, userId);

		return scenarioIds.stream()
				.map(scenarioId -> {
					Scenario scenario = findScenario(scenarioId);

					return new ScenarioDownloadResult(
							buildFileName(scenario.getName()),
							serializeJson(
									buildScenarioJsonWithoutValidation(
											scenarioId,
											userId
									)
							)
					);
				})
				.toList();
	}

	public ScenarioDownloadResult downloadFull(
			Long rootScenarioId,
			Long userId
	) {
		LinkedHashSet<Long> scenarioIds = new LinkedHashSet<>();

		collectScenarioIdsForZip(rootScenarioId, scenarioIds);

		validateUserVariablesForScenarios(scenarioIds, userId);

		ObjectNode root = buildScenarioJsonWithoutValidation(
				rootScenarioId,
				userId
		);

		LinkedHashMap<String, JsonNode> variablesByName =
				indexNamedItems(root.path("variables"), "variables");

		LinkedHashMap<String, JsonNode> backendRequestsByName =
				indexNamedItems(
						root.path("backendRequests"),
						"backendRequests"
				);

		ArrayNode expandedActions = expandActions(
				root.path("actions"),
				rootScenarioId,
				userId,
				new LinkedHashSet<>(),
				variablesByName,
				backendRequestsByName
		);

		root.set("actions", expandedActions);
		root.set("variables", toArrayNode(variablesByName.values()));
		root.set(
				"backendRequests",
				toArrayNode(backendRequestsByName.values())
		);

		Scenario rootScenario = findScenario(rootScenarioId);

		return new ScenarioDownloadResult(
				buildFileName(rootScenario.getName()),
				serializeJson(root)
		);
	}

	private void collectScenarioIdsForZip(
			Long scenarioId,
			LinkedHashSet<Long> collectedScenarioIds
	) {
		if (!collectedScenarioIds.add(scenarioId)) {
			return;
		}

		scenarioCustomMethodRepository
				.findAllBySourceScenarioId(scenarioId)
				.stream()
				.map(ScenarioCustomMethod::getTargetScenarioId)
				.forEach(targetScenarioId ->
						collectScenarioIdsForZip(
								targetScenarioId,
								collectedScenarioIds
						)
				);
	}

	private ArrayNode expandActions(
			JsonNode actionsNode,
			Long currentScenarioId,
			Long userId,
			LinkedHashSet<Long> recursionPath,
			LinkedHashMap<String, JsonNode> variablesByName,
			LinkedHashMap<String, JsonNode> backendRequestsByName
	) {
		if (!actionsNode.isArray()) {
			throw new IllegalStateException(
					"Сценарий с id=%d содержит невалидное поле actions"
							.formatted(currentScenarioId)
			);
		}

		if (!recursionPath.add(currentScenarioId)) {
			throw new IllegalStateException(
					"Обнаружена рекурсия custom methods: %s"
							.formatted(formatScenarioPath(recursionPath))
			);
		}

		ArrayNode result = objectMapper.createArrayNode();

		for (JsonNode actionNode : actionsNode) {
			if (!isCustomMethodAction(actionNode)) {
				result.add(actionNode.deepCopy());
				continue;
			}

			String targetScenarioName = actionNode.path("value")
					.asText()
					.trim();

			Scenario targetScenario = findLinkedScenarioByName(
					currentScenarioId,
					targetScenarioName
			);

			if (recursionPath.contains(targetScenario.getId())) {
				throw new IllegalStateException(
						"Обнаружена рекурсия custom methods: %s → %s"
								.formatted(
										formatScenarioPath(recursionPath),
										targetScenario.getName()
								)
				);
			}

			ObjectNode targetRoot = buildScenarioJsonWithoutValidation(
					targetScenario.getId(),
					userId
			);

			mergeNamedItems(
					variablesByName,
					targetRoot.path("variables"),
					"variables"
			);

			mergeNamedItems(
					backendRequestsByName,
					targetRoot.path("backendRequests"),
					"backendRequests"
			);

			ArrayNode targetActions = expandActions(
					targetRoot.path("actions"),
					targetScenario.getId(),
					userId,
					recursionPath,
					variablesByName,
					backendRequestsByName
			);

			targetActions.forEach(result::add);
		}

		recursionPath.remove(currentScenarioId);

		return result;
	}

	private boolean isCustomMethodAction(JsonNode actionNode) {
		return actionNode.isObject()
				&& "customMethod".equals(
				actionNode.path("action").asText()
		);
	}

	private Scenario findLinkedScenarioByName(
			Long sourceScenarioId,
			String targetScenarioName
	) {
		if (targetScenarioName.isBlank()) {
			throw new IllegalStateException(
					"Custom method в сценарии id=%d не содержит name в value"
							.formatted(sourceScenarioId)
			);
		}

		List<Long> targetScenarioIds = scenarioCustomMethodRepository
				.findAllBySourceScenarioId(sourceScenarioId)
				.stream()
				.map(ScenarioCustomMethod::getTargetScenarioId)
				.toList();

		Map<Long, Scenario> scenariosById =
				scenarioRepository.findAllById(targetScenarioIds)
						.stream()
						.collect(Collectors.toMap(
								Scenario::getId,
								Function.identity()
						));

		return targetScenarioIds.stream()
				.map(scenariosById::get)
				.filter(java.util.Objects::nonNull)
				.filter(scenario -> scenario.getName()
						.equalsIgnoreCase(targetScenarioName))
				.findFirst()
				.orElseThrow(() -> new IllegalStateException(
						"Для custom method «%s» в сценарии id=%d " +
								"не найдена связанная цель"
										.formatted(
												targetScenarioName,
												sourceScenarioId
										)
				));
	}

	private ObjectNode buildScenarioJson(
			Long scenarioId,
			Long userId
	) {
		validateUserVariablesForScenarios(
				List.of(scenarioId),
				userId
		);

		return buildScenarioJsonWithoutValidation(scenarioId, userId);
	}

	private ObjectNode buildScenarioJsonWithoutValidation(
			Long scenarioId,
			Long userId
	) {
		Scenario scenario = findScenario(scenarioId);

		ObjectNode root = parseScenarioPayload(
				scenario.getScenarioPayloadJson(),
				scenarioId
		);

		List<ScenarioVariable> scenarioVariables =
				scenarioVariableRepository
						.findAllByScenarioIdOrderByPositionAsc(scenarioId);

		Map<Long, Variable> variablesById =
				findVariablesById(scenarioVariables, scenarioId);

		Map<Long, UserVariable> userValuesByVariableId =
				userVariableRepository.findAllByUserId(userId)
						.stream()
						.collect(Collectors.toMap(
								UserVariable::getVariableId,
								Function.identity()
						));

		replaceUserVariableValues(
				root,
				variablesById,
				scenarioVariables,
				userValuesByVariableId,
				scenarioId
		);

		appendBackendRequests(root, scenarioId);

		return root;
	}

	private void validateUserVariablesForScenarios(
			Collection<Long> scenarioIds,
			Long userId
	) {
		Map<Long, UserVariable> userValuesByVariableId =
				userVariableRepository.findAllByUserId(userId)
						.stream()
						.collect(Collectors.toMap(
								UserVariable::getVariableId,
								Function.identity()
						));

		LinkedHashMap<Long, MissingUserVariableResponse> missingById =
				new LinkedHashMap<>();

		for (Long scenarioId : scenarioIds) {
			List<ScenarioVariable> scenarioVariables =
					scenarioVariableRepository
							.findAllByScenarioIdOrderByPositionAsc(scenarioId);

			Map<Long, Variable> variablesById =
					findVariablesById(scenarioVariables, scenarioId);

			for (ScenarioVariable scenarioVariable : scenarioVariables) {
				Variable variable = variablesById.get(
						scenarioVariable.getVariableId()
				);

				if (
						variable.isUserVariable() &&
								!userValuesByVariableId.containsKey(variable.getId())
				) {
					missingById.putIfAbsent(
							variable.getId(),
							new MissingUserVariableResponse(
									variable.getId(),
									variable.getName(),
									variable.getDescription()
							)
					);
				}
			}
		}

		if (!missingById.isEmpty()) {
			throw new MissingUserVariablesException(
					new ArrayList<>(missingById.values())
			);
		}
	}

	private Map<Long, Variable> findVariablesById(
			List<ScenarioVariable> scenarioVariables,
			Long scenarioId
	) {
		Set<Long> variableIds = scenarioVariables.stream()
				.map(ScenarioVariable::getVariableId)
				.collect(Collectors.toSet());

		Map<Long, Variable> variablesById =
				variableRepository.findAllById(variableIds)
						.stream()
						.collect(Collectors.toMap(
								Variable::getId,
								Function.identity()
						));

		if (variablesById.size() != variableIds.size()) {
			throw new IllegalStateException(
					"У сценария id=%d есть ссылка на несуществующую переменную"
							.formatted(scenarioId)
			);
		}

		return variablesById;
	}

	private void replaceUserVariableValues(
			ObjectNode root,
			Map<Long, Variable> variablesById,
			List<ScenarioVariable> scenarioVariables,
			Map<Long, UserVariable> userValuesByVariableId,
			Long scenarioId
	) {
		JsonNode variablesNode = root.get("variables");

		if (variablesNode == null || !variablesNode.isArray()) {
			return;
		}

		Map<String, UserVariable> userValuesByVariableName =
				scenarioVariables.stream()
						.map(scenarioVariable -> {
							Variable variable = variablesById.get(
									scenarioVariable.getVariableId()
							);

							UserVariable userVariable =
									userValuesByVariableId.get(variable.getId());

							if (
									!variable.isUserVariable() ||
											userVariable == null
							) {
								return null;
							}

							return Map.entry(
									normalizeName(variable.getName()),
									userVariable
							);
						})
						.filter(java.util.Objects::nonNull)
						.collect(Collectors.toMap(
								Map.Entry::getKey,
								Map.Entry::getValue,
								(first, ignored) -> first
						));

		for (JsonNode variableNode : variablesNode) {
			if (!variableNode.isObject()) {
				continue;
			}

			ObjectNode objectNode = (ObjectNode) variableNode;

			String variableName = objectNode.path("name")
					.asText()
					.trim();

			UserVariable userVariable = userValuesByVariableName.get(
					normalizeName(variableName)
			);

			if (userVariable != null) {
				objectNode.put("value", userVariable.getValue());
			}
		}
	}

	private void appendBackendRequests(
			ObjectNode root,
			Long scenarioId
	) {
		ArrayNode backendRequestsNode = objectMapper.createArrayNode();

		List<Long> backendRequestIds =
				scenarioBackendRequestRepository
						.findAllByScenarioId(scenarioId)
						.stream()
						.map(ScenarioBackendRequest::getBackendRequestId)
						.toList();

		Map<Long, BackendRequest> backendRequestsById =
				backendRequestRepository.findAllById(backendRequestIds)
						.stream()
						.collect(Collectors.toMap(
								BackendRequest::getId,
								Function.identity()
						));

		for (Long backendRequestId : backendRequestIds) {
			BackendRequest backendRequest = backendRequestsById.get(
					backendRequestId
			);

			if (backendRequest == null) {
				throw new IllegalStateException(
						"Не найден backend-запрос id=%d, связанный со сценарием id=%d"
								.formatted(backendRequestId, scenarioId)
				);
			}

			backendRequestsNode.add(
					backendRequestExportMapper.toJson(backendRequest)
			);
		}

		root.set("backendRequests", backendRequestsNode);
	}

	private LinkedHashMap<String, JsonNode> indexNamedItems(
			JsonNode itemsNode,
			String fieldName
	) {
		LinkedHashMap<String, JsonNode> itemsByName =
				new LinkedHashMap<>();

		mergeNamedItems(itemsByName, itemsNode, fieldName);

		return itemsByName;
	}

	private void mergeNamedItems(
			LinkedHashMap<String, JsonNode> itemsByName,
			JsonNode itemsNode,
			String fieldName
	) {
		if (!itemsNode.isArray()) {
			throw new IllegalStateException(
					"Поле %s должно быть массивом"
							.formatted(fieldName)
			);
		}

		for (JsonNode itemNode : itemsNode) {
			if (!itemNode.isObject()) {
				throw new IllegalStateException(
						"Каждый элемент %s должен быть объектом"
								.formatted(fieldName)
				);
			}

			String name = itemNode.path("name").asText().trim();

			if (name.isBlank()) {
				throw new IllegalStateException(
						"Элемент %s не содержит name"
								.formatted(fieldName)
				);
			}

			itemsByName.putIfAbsent(
					normalizeName(name),
					itemNode.deepCopy()
			);
		}
	}

	private ArrayNode toArrayNode(
			Collection<JsonNode> items
	) {
		ArrayNode result = objectMapper.createArrayNode();

		items.forEach(result::add);

		return result;
	}

	private ObjectNode parseScenarioPayload(
			String payload,
			Long scenarioId
	) {
		try {
			JsonNode root = objectMapper.readTree(payload);

			if (root == null || !root.isObject()) {
				throw new IllegalStateException(
						"Сценарий id=%d содержит невалидный JSON payload"
								.formatted(scenarioId)
				);
			}

			return (ObjectNode) root;
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException(
					"Сценарий id=%d содержит невалидный JSON payload"
							.formatted(scenarioId),
					exception
			);
		}
	}

	private Scenario findScenario(Long scenarioId) {
		return scenarioRepository.findById(scenarioId)
				.orElseThrow(() -> new EntityNotFoundException(
						"Сценарий с id=%d не найден"
								.formatted(scenarioId)
				));
	}

	private String serializeJson(ObjectNode root) {
		try {
			return objectMapper.writerWithDefaultPrettyPrinter()
					.writeValueAsString(root);
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException(
					"Не удалось сериализовать JSON сценария",
					exception
			);
		}
	}

	private String buildFileName(String scenarioName) {
		String safeName = scenarioName
				.replaceAll("[\\\\/:*?\"<>|]", "_")
				.trim()
				.replaceAll("\\s+", "_");

		return safeName + ".json";
	}

	private String normalizeName(String name) {
		return name.trim().toLowerCase(Locale.ROOT);
	}

	private String formatScenarioPath(
			LinkedHashSet<Long> recursionPath
	) {
		return recursionPath.stream()
				.map(String::valueOf)
				.collect(Collectors.joining(" → "));
	}
}