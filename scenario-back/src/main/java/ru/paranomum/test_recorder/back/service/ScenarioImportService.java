package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestResponse;
import ru.paranomum.test_recorder.back.dto.backendrequests.merge.BackendRequestMergeRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioResponse;
import ru.paranomum.test_recorder.back.dto.scenarios.imports.ScenarioImportBackendResolutionRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.imports.ScenarioImportCustomMethodResolutionRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.imports.ScenarioImportRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.imports.ScenarioImportVariableRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.imports.ScenarioImportVariableResolutionRequest;
import ru.paranomum.test_recorder.back.dto.tags.TagResponse;
import ru.paranomum.test_recorder.back.entity.BackendRequest;
import ru.paranomum.test_recorder.back.entity.Scenario;
import ru.paranomum.test_recorder.back.entity.ScenarioBackendRequest;
import ru.paranomum.test_recorder.back.entity.ScenarioCustomMethod;
import ru.paranomum.test_recorder.back.entity.ScenarioTag;
import ru.paranomum.test_recorder.back.entity.ScenarioVariable;
import ru.paranomum.test_recorder.back.entity.Tag;
import ru.paranomum.test_recorder.back.entity.Variable;
import ru.paranomum.test_recorder.back.exception.ScenarioAlreadyExistsException;
import ru.paranomum.test_recorder.back.exception.VariableAlreadyExistsException;
import ru.paranomum.test_recorder.back.repository.BackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioBackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioCustomMethodRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioTagRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioVariableRepository;
import ru.paranomum.test_recorder.back.repository.TagRepository;
import ru.paranomum.test_recorder.back.repository.VariableRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScenarioImportService {

	private static final String DEFAULT_HEADERS_JSON = "{}";
	private static final String DEFAULT_ARRAY_JSON = "[]";

	private final ObjectMapper objectMapper;
	private final BackendRequestService backendRequestService;
	private final BackendRequestRepository backendRequestRepository;
	private final ScenarioRepository scenarioRepository;
	private final VariableRepository variableRepository;
	private final TagRepository tagRepository;
	private final ScenarioBackendRequestRepository scenarioBackendRequestRepository;
	private final ScenarioVariableRepository scenarioVariableRepository;
	private final ScenarioCustomMethodRepository scenarioCustomMethodRepository;
	private final ScenarioTagRepository scenarioTagRepository;

	@Transactional
	public ScenarioResponse importScenario(ScenarioImportRequest request) {
		String scenarioName = normalizeName(request.values().name());

		if (scenarioRepository.existsByNameIgnoreCase(scenarioName)) {
			throw new ScenarioAlreadyExistsException(scenarioName);
		}

		Map<String, ResolvedVariable> variablesByImportedName =
				resolveVariables(request.variableResolutions());

		Map<String, String> variableNameReplacements =
				variablesByImportedName.entrySet()
						.stream()
						.collect(Collectors.toMap(
								Map.Entry::getKey,
								entry -> entry.getValue().variable().getName()
						));

		List<ScenarioImportBackendResolutionRequest>
				backendResolutionsWithVariables =
				replaceVariablesInBackendResolutions(
						request.backendResolutions(),
						variableNameReplacements
				);

		Map<String, ResolvedBackendRequest> backendRequestsByImportedName =
				resolveBackendRequests(
						backendResolutionsWithVariables
				);

		Map<String, String> backendRequestNameReplacements =
				backendRequestsByImportedName.entrySet()
						.stream()
						.collect(Collectors.toMap(
								Map.Entry::getKey,
								entry -> entry.getValue().name()
						));

		Map<String, Scenario> customMethodsByImportedName =
				resolveCustomMethods(request.customMethodResolutions());

		Map<String, String> customMethodNameReplacements =
				customMethodsByImportedName.entrySet()
						.stream()
						.collect(Collectors.toMap(
								Map.Entry::getKey,
								entry -> entry.getValue().getName()
						));

		ObjectNode payload = resolvePayload(
				request.payload(),
				variableNameReplacements,
				backendRequestNameReplacements,
				customMethodNameReplacements
		);

		validatePayloadVariableDeclarations(
				payload,
				variablesByImportedName
		);

		List<Tag> tags = resolveTags(request.values().tagIds());

		Scenario scenario = scenarioRepository.save(
				new Scenario(
						scenarioName,
						normalizeDescription(request.values().description()),
						serializeJson(payload)
				)
		);

		saveScenarioBackendRequests(
				scenario.getId(),
				backendRequestsByImportedName.values()
		);

		saveScenarioVariables(
				scenario.getId(),
				variablesByImportedName.values()
		);

		saveScenarioCustomMethods(
				scenario.getId(),
				customMethodsByImportedName.values()
		);

		saveScenarioTags(scenario.getId(), tags);

		return toResponse(scenario, tags);
	}

	private Map<String, ResolvedVariable> resolveVariables(
			List<ScenarioImportVariableResolutionRequest> resolutions
	) {
		Map<String, ResolvedVariable> result = new HashMap<>();

		for (ScenarioImportVariableResolutionRequest resolution : resolutions) {
			ScenarioImportVariableRequest imported =
					resolution.importedVariable();

			String importedName = normalizeName(imported.name());
			String importedKey = normalizeKey(importedName);

			if (result.containsKey(importedKey)) {
				throw new IllegalArgumentException(
						"Переменная указана в import resolution несколько раз: "
								+ importedName
				);
			}

			Variable variable = switch (resolution.kind()) {
				case "existing", "selected-existing" -> {
					if (resolution.targetVariableId() == null) {
						throw new IllegalArgumentException(
								"targetVariableId обязателен для existing variable"
						);
					}

					yield findVariable(resolution.targetVariableId());
				}

				case "create-new-user" -> {
					if (resolution.targetVariableId() != null) {
						throw new IllegalArgumentException(
								"targetVariableId должен отсутствовать "
										+ "для create-new-user"
						);
					}

					yield createVariable(imported);
				}

				default -> throw new IllegalArgumentException(
						"Неподдерживаемый kind variable resolution: "
								+ resolution.kind()
				);
			};

			result.put(
					importedKey,
					new ResolvedVariable(
							importedName,
							variable,
							imported.defaultValue(),
							imported.position()
					)
			);
		}

		return result;
	}

	private Variable createVariable(ScenarioImportVariableRequest request) {
		String name = normalizeName(request.name());

		if (variableRepository.existsByNameIgnoreCase(name)) {
			throw new VariableAlreadyExistsException(name);
		}

		try {
			return variableRepository.save(
					new Variable(
							name,
							normalizeDescription(request.description()),
							request.isUserVariable()
					)
			);
		} catch (org.springframework.dao.DataIntegrityViolationException exception) {
			throw new VariableAlreadyExistsException(name);
		}
	}

	private Variable findVariable(Long id) {
		return variableRepository.findById(id)
				.orElseThrow(() -> new IllegalArgumentException(
						"Переменная не найдена: " + id
				));
	}

	private List<ScenarioImportBackendResolutionRequest>
	replaceVariablesInBackendResolutions(
			List<ScenarioImportBackendResolutionRequest> resolutions,
			Map<String, String> variableNameReplacements
	) {
		return resolutions.stream()
				.map(resolution -> {
					BackendRequestRequest resolvedRequest =
							replaceVariablesInBackendRequest(
									resolution.resolvedRequest(),
									variableNameReplacements
							);

					BackendRequestMergeRequest mergeDraft =
							resolution.mergeDraft() == null
									? null
									: new BackendRequestMergeRequest(
									replaceVariablesInBackendRequest(
											resolution.mergeDraft()
													.backendRequest(),
											variableNameReplacements
									),
									resolution.mergeDraft()
											.scenarioVariableMigrations()
							);

					return new ScenarioImportBackendResolutionRequest(
							resolution.kind(),
							resolvedRequest,
							resolution.existingBackendRequestId(),
							mergeDraft
					);
				})
				.toList();
	}

	private BackendRequestRequest replaceVariablesInBackendRequest(
			BackendRequestRequest request,
			Map<String, String> replacements
	) {
		return new BackendRequestRequest(
				request.name(),
				replaceVariableReferences(request.url(), replacements),
				request.httpMethod(),
				replaceNullableVariableReferences(
						request.requestBody(),
						replacements
				),
				replaceVariableReferencesInJson(
						request.requestHeadersJson(),
						DEFAULT_HEADERS_JSON,
						replacements,
						false
				),
				replaceNullableVariableReferences(
						request.capturedResponseBody(),
						replacements
				),
				replaceVariableReferences(request.token(), replacements),
				request.bodyType(),
				replaceVariableReferencesInJson(
						request.formDataJson(),
						DEFAULT_ARRAY_JSON,
						replacements,
						false
				),
				replaceVariableReferencesInJson(
						request.fieldOverridesJson(),
						DEFAULT_ARRAY_JSON,
						replacements,
						false
				),
				replaceVariableReferencesInJson(
						request.responseExtractorsJson(),
						DEFAULT_ARRAY_JSON,
						replacements,
						true
				)
		);
	}

	private Map<String, ResolvedBackendRequest> resolveBackendRequests(
			List<ScenarioImportBackendResolutionRequest> resolutions
	) {
		Map<String, ResolvedBackendRequest> result = new HashMap<>();

		for (ScenarioImportBackendResolutionRequest resolution : resolutions) {
			BackendRequestRequest resolvedRequest =
					resolution.resolvedRequest();

			String importedName = normalizeName(resolvedRequest.name());
			String importedKey = normalizeKey(importedName);

			if (result.containsKey(importedKey)) {
				throw new IllegalArgumentException(
						"Backend method указан в import resolution несколько раз: "
								+ importedName
				);
			}

			BackendRequestResponse backendRequest = switch (resolution.kind()) {
				case "new", "renamed" -> {
					if (resolution.existingBackendRequestId() != null
							|| resolution.mergeDraft() != null) {
						throw new IllegalArgumentException(
								"existingBackendRequestId и mergeDraft не должны "
										+ "передаваться для " + resolution.kind()
						);
					}

					yield backendRequestService.create(resolvedRequest);
				}

				case "existing" -> {
					if (resolution.existingBackendRequestId() == null) {
						throw new IllegalArgumentException(
								"existingBackendRequestId обязателен для existing"
						);
					}

					if (resolution.mergeDraft() != null) {
						throw new IllegalArgumentException(
								"mergeDraft не должен передаваться для existing"
						);
					}

					BackendRequest existing = findBackendRequest(
							resolution.existingBackendRequestId()
					);

					yield toBackendRequestResponse(existing);
				}

				case "merged" -> {
					if (resolution.existingBackendRequestId() == null
							|| resolution.mergeDraft() == null) {
						throw new IllegalArgumentException(
								"existingBackendRequestId и mergeDraft обязательны "
										+ "для merged"
						);
					}

					String mergedName = normalizeName(
							resolution.mergeDraft()
									.backendRequest()
									.name()
					);

					if (!importedName.equalsIgnoreCase(mergedName)) {
						throw new IllegalArgumentException(
								"resolvedRequest.name и mergeDraft.backendRequest.name "
										+ "должны совпадать"
						);
					}

					yield backendRequestService.mergeForScenarioImport(
							resolution.existingBackendRequestId(),
							resolution.mergeDraft()
					);
				}

				default -> throw new IllegalArgumentException(
						"Неподдерживаемый kind backend resolution: "
								+ resolution.kind()
				);
			};

			result.put(
					importedKey,
					new ResolvedBackendRequest(
							importedName,
							backendRequest.id(),
							backendRequest.name()
					)
			);
		}

		return result;
	}

	private BackendRequest findBackendRequest(Long id) {
		return backendRequestRepository.findById(id)
				.orElseThrow(() -> new IllegalArgumentException(
						"Backend-запрос не найден: " + id
				));
	}

	private BackendRequestResponse toBackendRequestResponse(
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

	private Map<String, Scenario> resolveCustomMethods(
			List<ScenarioImportCustomMethodResolutionRequest> resolutions
	) {
		Set<Long> targetScenarioIds = resolutions.stream()
				.map(ScenarioImportCustomMethodResolutionRequest::targetScenarioId)
				.collect(Collectors.toSet());

		Map<Long, Scenario> scenariosById = scenarioRepository
				.findAllById(targetScenarioIds)
				.stream()
				.collect(Collectors.toMap(
						Scenario::getId,
						scenario -> scenario
				));

		if (scenariosById.size() != targetScenarioIds.size()) {
			throw new IllegalArgumentException(
					"Один или несколько custom method scenarios не найдены"
			);
		}

		Map<String, Scenario> result = new HashMap<>();

		for (ScenarioImportCustomMethodResolutionRequest resolution : resolutions) {
			String importedName = normalizeName(
					resolution.importedCustomMethodName()
			);
			String importedKey = normalizeKey(importedName);

			if (result.containsKey(importedKey)) {
				throw new IllegalArgumentException(
						"Custom method указан в import resolution несколько раз: "
								+ importedName
				);
			}

			if (!"existing".equals(resolution.kind())
					&& !"selected-existing".equals(resolution.kind())) {
				throw new IllegalArgumentException(
						"Неподдерживаемый kind custom method resolution: "
								+ resolution.kind()
				);
			}

			result.put(
					importedKey,
					scenariosById.get(resolution.targetScenarioId())
			);
		}

		return result;
	}

	private ObjectNode resolvePayload(
			JsonNode source,
			Map<String, String> variableNameReplacements,
			Map<String, String> backendRequestNameReplacements,
			Map<String, String> customMethodNameReplacements
	) {
		if (source == null || !source.isObject()) {
			throw new IllegalArgumentException(
					"Payload сценария должен быть JSON-объектом"
			);
		}

		ObjectNode root = ((ObjectNode) source).deepCopy();

		replaceVariableReferencesInNode(root, variableNameReplacements);
		replaceResponseExtractorVariableNames(
				root,
				variableNameReplacements
		);
		replacePayloadVariableNames(root, variableNameReplacements);
		replaceBackendMethodActions(
				root,
				backendRequestNameReplacements
		);
		renameScenarioOverrideKeys(
				root,
				backendRequestNameReplacements
		);
		replaceCustomMethodActions(
				root,
				customMethodNameReplacements
		);

		root.remove("backendRequests");

		return root;
	}

	private void replaceVariableReferencesInNode(
			JsonNode node,
			Map<String, String> replacements
	) {
		if (replacements.isEmpty()) {
			return;
		}

		if (node.isArray()) {
			for (JsonNode item : node) {
				replaceVariableReferencesInNode(item, replacements);
			}

			return;
		}

		if (!node.isObject()) {
			return;
		}

		ObjectNode object = (ObjectNode) node;
		List<String> fields = new ArrayList<>();
		object.fieldNames().forEachRemaining(fields::add);

		for (String field : fields) {
			JsonNode value = object.get(field);

			if (value != null && value.isTextual()) {
				object.put(
						field,
						replaceVariableReferences(
								value.asText(),
								replacements
						)
				);
			} else if (value != null) {
				replaceVariableReferencesInNode(value, replacements);
			}
		}
	}

	private void replaceResponseExtractorVariableNames(
			JsonNode node,
			Map<String, String> replacements
	) {
		if (replacements.isEmpty()) {
			return;
		}

		if (node.isArray()) {
			for (JsonNode item : node) {
				replaceResponseExtractorVariableNames(item, replacements);
			}

			return;
		}

		if (!node.isObject()) {
			return;
		}

		ObjectNode object = (ObjectNode) node;

		JsonNode variableName = object.get("variableName");

		if (variableName != null && variableName.isTextual()) {
			String replacement = findReplacement(
					replacements,
					variableName.asText()
			);

			if (replacement != null) {
				object.put("variableName", replacement);
			}
		}

		object.elements().forEachRemaining(
				item -> replaceResponseExtractorVariableNames(
						item,
						replacements
				)
		);
	}

	private void replacePayloadVariableNames(
			ObjectNode root,
			Map<String, String> replacements
	) {
		JsonNode variablesNode = root.get("variables");

		if (variablesNode == null || !variablesNode.isArray()) {
			return;
		}

		for (JsonNode item : variablesNode) {
			if (!item.isObject()) {
				continue;
			}

			ObjectNode variable = (ObjectNode) item;
			JsonNode name = variable.get("name");

			if (name == null || !name.isTextual()) {
				continue;
			}

			String replacement = findReplacement(
					replacements,
					name.asText()
			);

			if (replacement != null) {
				variable.put("name", replacement);
			}
		}
	}

	private void replaceBackendMethodActions(
			ObjectNode root,
			Map<String, String> replacements
	) {
		JsonNode actionsNode = root.get("actions");

		if (actionsNode == null || !actionsNode.isArray()) {
			return;
		}

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

			String replacement = findReplacement(
					replacements,
					action.path("value").asText()
			);

			if (replacement != null) {
				action.put("value", replacement);
			}
		}
	}

	private void renameScenarioOverrideKeys(
			ObjectNode root,
			Map<String, String> replacements
	) {
		JsonNode overridesNode = root.get("scenarioOverrides");

		if (overridesNode == null || !overridesNode.isObject()) {
			return;
		}

		ObjectNode overrides = (ObjectNode) overridesNode;

		for (Map.Entry<String, String> replacement
				: replacements.entrySet()) {
			String oldKey = findExistingFieldIgnoreCase(
					overrides,
					replacement.getKey()
			);

			if (oldKey == null || oldKey.equals(replacement.getValue())) {
				continue;
			}

			JsonNode value = overrides.remove(oldKey);
			overrides.set(replacement.getValue(), value);
		}
	}

	private void replaceCustomMethodActions(
			JsonNode node,
			Map<String, String> replacements
	) {
		if (node.isArray()) {
			for (JsonNode item : node) {
				replaceCustomMethodActions(item, replacements);
			}

			return;
		}

		if (!node.isObject()) {
			return;
		}

		ObjectNode object = (ObjectNode) node;

		if ("customMethod".equals(object.path("action").asText())) {
			String replacement = findReplacement(
					replacements,
					object.path("value").asText()
			);

			if (replacement != null) {
				object.put("value", replacement);
			}
		}

		object.elements().forEachRemaining(
				item -> replaceCustomMethodActions(item, replacements)
		);
	}

	private void validatePayloadVariableDeclarations(
			ObjectNode payload,
			Map<String, ResolvedVariable> variablesByImportedName
	) {
		JsonNode variablesNode = payload.get("variables");

		if (variablesNode == null || !variablesNode.isArray()) {
			if (!variablesByImportedName.isEmpty()) {
				throw new IllegalArgumentException(
						"Payload не содержит variables[] для import resolutions"
				);
			}

			return;
		}

		Set<String> declaredVariableNames = new HashSet<>();

		for (JsonNode item : variablesNode) {
			if (!item.isObject()) {
				throw new IllegalArgumentException(
						"Каждый элемент payload.variables должен быть объектом"
				);
			}

			String variableName = item.path("name").asText();

			if (variableName.isBlank()) {
				throw new IllegalArgumentException(
						"Каждая переменная payload.variables должна иметь name"
				);
			}

			if (!declaredVariableNames.add(normalizeKey(variableName))) {
				throw new IllegalArgumentException(
						"Переменная в payload.variables указана несколько раз: "
								+ variableName
				);
			}
		}

		Set<String> resolvedVariableNames = variablesByImportedName.values()
				.stream()
				.map(resolved -> normalizeKey(resolved.variable().getName()))
				.collect(Collectors.toSet());

		if (!declaredVariableNames.equals(resolvedVariableNames)) {
			throw new IllegalArgumentException(
					"Состав payload.variables не совпадает с variable resolutions"
			);
		}
	}

	private List<Tag> resolveTags(List<Long> tagIds) {
		List<Long> distinctTagIds = tagIds.stream()
				.distinct()
				.toList();

		if (distinctTagIds.size() != tagIds.size()) {
			throw new IllegalArgumentException(
					"Один и тот же тег указан несколько раз"
			);
		}

		List<Tag> tags = tagRepository.findAllById(distinctTagIds);

		if (tags.size() != distinctTagIds.size()) {
			throw new IllegalArgumentException(
					"Один или несколько тегов не найдены"
			);
		}

		return tags;
	}

	private void saveScenarioBackendRequests(
			Long scenarioId,
			Iterable<ResolvedBackendRequest> backendRequests
	) {
		Set<Long> backendRequestIds = new HashSet<>();

		for (ResolvedBackendRequest backendRequest : backendRequests) {
			backendRequestIds.add(backendRequest.id());
		}

		scenarioBackendRequestRepository.saveAll(
				backendRequestIds.stream()
						.map(backendRequestId -> new ScenarioBackendRequest(
								scenarioId,
								backendRequestId
						))
						.toList()
		);
	}

	private void saveScenarioVariables(
			Long scenarioId,
			Iterable<ResolvedVariable> variables
	) {
		Set<Long> variableIds = new HashSet<>();
		Set<Integer> positions = new HashSet<>();
		List<ScenarioVariable> links = new ArrayList<>();

		for (ResolvedVariable resolved : variables) {
			if (!variableIds.add(resolved.variable().getId())) {
				throw new IllegalArgumentException(
						"Одна переменная не может быть добавлена в сценарий дважды"
				);
			}

			if (resolved.defaultValue() == null) {
				throw new IllegalArgumentException(
						"defaultValue обязателен для: "
								+ resolved.importedName()
				);
			}

			if (resolved.position() == null || resolved.position() < 0) {
				throw new IllegalArgumentException(
						"position должен быть неотрицательным для: "
								+ resolved.importedName()
				);
			}

			if (!positions.add(resolved.position())) {
				throw new IllegalArgumentException(
						"Позиции переменных не должны повторяться"
				);
			}

			links.add(
					new ScenarioVariable(
							scenarioId,
							resolved.variable().getId(),
							resolved.defaultValue(),
							resolved.position()
					)
			);
		}

		scenarioVariableRepository.saveAll(links);
	}

	private void saveScenarioCustomMethods(
			Long scenarioId,
			Iterable<Scenario> targetScenarios
	) {
		Set<Long> targetScenarioIds = new HashSet<>();

		for (Scenario targetScenario : targetScenarios) {
			if (scenarioId.equals(targetScenario.getId())) {
				throw new IllegalArgumentException(
						"Сценарий не может быть custom method самого себя"
				);
			}

			targetScenarioIds.add(targetScenario.getId());
		}

		scenarioCustomMethodRepository.saveAll(
				targetScenarioIds.stream()
						.map(targetScenarioId -> new ScenarioCustomMethod(
								scenarioId,
								targetScenarioId
						))
						.toList()
		);
	}

	private void saveScenarioTags(Long scenarioId, List<Tag> tags) {
		scenarioTagRepository.saveAll(
				tags.stream()
						.map(tag -> new ScenarioTag(
								scenarioId,
								tag.getId()
						))
						.toList()
		);
	}

	private String replaceVariableReferencesInJson(
			String json,
			String fallback,
			Map<String, String> replacements,
			boolean replaceResponseExtractorNames
	) {
		JsonNode node = parseJsonOrFallback(json, fallback);

		replaceVariableReferencesInNode(node, replacements);

		if (replaceResponseExtractorNames) {
			replaceResponseExtractorVariableNames(node, replacements);
		}

		return serializeJson(node);
	}

	private JsonNode parseJsonOrFallback(String json, String fallback) {
		String value = json == null || json.isBlank()
				? fallback
				: json;

		try {
			return objectMapper.readTree(value);
		} catch (JsonProcessingException exception) {
			try {
				return objectMapper.readTree(fallback);
			} catch (JsonProcessingException fallbackException) {
				throw new IllegalStateException(
						"Не удалось разобрать JSON",
						fallbackException
				);
			}
		}
	}

	private String serializeJson(JsonNode node) {
		try {
			return objectMapper.writeValueAsString(node);
		} catch (JsonProcessingException exception) {
			throw new IllegalArgumentException(
					"Не удалось сериализовать JSON",
					exception
			);
		}
	}

	private String replaceNullableVariableReferences(
			String value,
			Map<String, String> replacements
	) {
		return value == null
				? null
				: replaceVariableReferences(value, replacements);
	}

	private String replaceVariableReferences(
			String value,
			Map<String, String> replacements
	) {
		if (value == null || replacements.isEmpty()) {
			return value;
		}

		String result = value;

		for (Map.Entry<String, String> replacement
				: replacements.entrySet()) {
			result = result.replace(
					"${" + replacement.getKey() + "}",
					"${" + replacement.getValue() + "}"
			);
		}

		return result;
	}

	private String findReplacement(
			Map<String, String> replacements,
			String value
	) {
		if (value == null || value.isBlank()) {
			return null;
		}

		return replacements.get(normalizeKey(value));
	}

	private String findExistingFieldIgnoreCase(
			ObjectNode object,
			String targetName
	) {
		List<String> fieldNames = new ArrayList<>();
		object.fieldNames().forEachRemaining(fieldNames::add);

		return fieldNames.stream()
				.filter(name -> name.equalsIgnoreCase(targetName))
				.findFirst()
				.orElse(null);
	}

	private String normalizeName(String value) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException("Значение обязательно");
		}

		return value.trim().replaceAll("\\s+", " ");
	}

	private String normalizeDescription(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}

		return value.trim();
	}

	private String normalizeKey(String value) {
		return normalizeName(value).toLowerCase(Locale.ROOT);
	}

	private ScenarioResponse toResponse(
			Scenario scenario,
			List<Tag> tags
	) {
		List<TagResponse> tagResponses = tags.stream()
				.map(tag -> new TagResponse(
						tag.getId(),
						tag.getName(),
						tag.getColor()
				))
				.toList();

		return new ScenarioResponse(
				scenario.getId(),
				scenario.getName(),
				scenario.getDescription(),
				scenario.getScenarioPayloadJson(),
				tagResponses
		);
	}

	private record ResolvedBackendRequest(
			String importedName,
			Long id,
			String name
	) {
	}

	private record ResolvedVariable(
			String importedName,
			Variable variable,
			String defaultValue,
			Integer position
	) {
	}
}