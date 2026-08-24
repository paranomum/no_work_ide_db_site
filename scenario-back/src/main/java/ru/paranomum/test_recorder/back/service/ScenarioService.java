package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.scenarios.*;
import ru.paranomum.test_recorder.back.entity.*;
import ru.paranomum.test_recorder.back.exception.MissingUserVariablesException;
import ru.paranomum.test_recorder.back.exception.ScenarioAlreadyExistsException;
import ru.paranomum.test_recorder.back.exception.ScenarioJsonInvalidException;
import ru.paranomum.test_recorder.back.repository.*;

import ru.paranomum.test_recorder.back.dto.tags.TagResponse;

import ru.paranomum.test_recorder.back.entity.BackendRequest;
import ru.paranomum.test_recorder.back.entity.ScenarioBackendRequest;
import ru.paranomum.test_recorder.back.repository.BackendRequestRepository;
import ru.paranomum.test_recorder.back.repository.ScenarioBackendRequestRepository;

import ru.paranomum.test_recorder.back.entity.ScenarioCustomMethod;
import ru.paranomum.test_recorder.back.repository.ScenarioCustomMethodRepository;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ScenarioService {

	private final ScenarioRepository scenarioRepository;
	private final ObjectMapper objectMapper;

	private final ScenarioTagRepository scenarioTagRepository;
	private final ScenarioVariableRepository scenarioVariableRepository;
	private final TagRepository tagRepository;
	private final VariableRepository variableRepository;

	private final BackendRequestRepository backendRequestRepository;
	private final ScenarioBackendRequestRepository scenarioBackendRequestRepository;
	private final ScenarioCustomMethodRepository
			scenarioCustomMethodRepository;

	private final UserVariableRepository userVariableRepository;
	private final BackendRequestExportMapper backendRequestExportMapper;

	public ScenarioService(
			ScenarioRepository scenarioRepository,
			ScenarioTagRepository scenarioTagRepository,
			TagRepository tagRepository,
			ScenarioVariableRepository scenarioVariableRepository,
			VariableRepository variableRepository,
			BackendRequestRepository backendRequestRepository,
			ScenarioBackendRequestRepository scenarioBackendRequestRepository,
			ScenarioCustomMethodRepository scenarioCustomMethodRepository,
			UserVariableRepository userVariableRepository,
			BackendRequestExportMapper backendRequestExportMapper,
			ObjectMapper objectMapper
	) {
		this.scenarioRepository = scenarioRepository;
		this.scenarioTagRepository = scenarioTagRepository;
		this.tagRepository = tagRepository;
		this.objectMapper = objectMapper;
		this.scenarioVariableRepository = scenarioVariableRepository;
		this.variableRepository = variableRepository;
		this.backendRequestRepository = backendRequestRepository;
		this.scenarioBackendRequestRepository =
				scenarioBackendRequestRepository;
		this.scenarioCustomMethodRepository =
				scenarioCustomMethodRepository;
		this.userVariableRepository = userVariableRepository;
		this.backendRequestExportMapper = backendRequestExportMapper;
	}

	public ScenarioDownloadResult downloadScenario(
			Long scenarioId,
			Long userId
	) {
		Scenario scenario = findById(scenarioId);

		ObjectNode root = parseScenarioPayload(
				scenario.getScenarioPayloadJson()
		);

		List<ScenarioVariable> scenarioVariables =
				scenarioVariableRepository
						.findAllByScenarioIdOrderByPositionAsc(scenarioId);

		Map<Long, Variable> variablesById =
				variableRepository.findAllById(
								scenarioVariables.stream()
										.map(ScenarioVariable::getVariableId)
										.toList()
						).stream()
						.collect(Collectors.toMap(
								Variable::getId,
								Function.identity()
						));

		Map<String, Variable> variablesByName =
				variablesById.values()
						.stream()
						.collect(Collectors.toMap(
								Variable::getName,
								Function.identity()
						));

		Map<Long, UserVariable> userValuesByVariableId =
				userVariableRepository.findAllByUserId(userId)
						.stream()
						.collect(Collectors.toMap(
								UserVariable::getVariableId,
								Function.identity()
						));

		List<MissingUserVariableResponse> missingVariables =
				findMissingUserVariables(
						scenarioVariables,
						variablesById,
						userValuesByVariableId
				);

		if (!missingVariables.isEmpty()) {
			throw new MissingUserVariablesException(missingVariables);
		}

		replaceUserVariableValues(
				root,
				variablesByName,
				userValuesByVariableId
		);

		appendBackendRequests(root, scenarioId);

		return new ScenarioDownloadResult(
				buildFileName(scenario.getName()),
				serializeJson(root)
		);
	}

	public List<ScenarioResponse> getAll(
			String query,
			List<Long> tagIds
	) {
		List<Scenario> scenarios;

		if (tagIds != null && !tagIds.isEmpty()) {
			List<Long> distinctTagIds = tagIds.stream()
					.distinct()
					.toList();

			scenarios = scenarioRepository.findAllByTagIdsAnd(
					distinctTagIds,
					distinctTagIds.size()
			);
		} else if (query == null || query.isBlank()) {
			scenarios = scenarioRepository.findAllByOrderByNameAsc();
		} else {
			scenarios = scenarioRepository
					.findAllByNameContainingIgnoreCaseOrderByNameAsc(
							query.trim()
					);
		}

		return scenarios.stream()
				.map(this::toResponse)
				.toList();
	}

	public ScenarioResponse getById(Long id) {
		return toResponse(findById(id));
	}

	public List<ScenarioBackendRequestResponse> getBackendRequests(
			Long scenarioId
	) {
		findById(scenarioId);

		List<Long> backendRequestIds = scenarioBackendRequestRepository
				.findAllByScenarioId(scenarioId)
				.stream()
				.map(ScenarioBackendRequest::getBackendRequestId)
				.toList();

		if (backendRequestIds.isEmpty()) {
			return List.of();
		}

		Map<Long, BackendRequest> backendRequestsById =
				backendRequestRepository.findAllById(backendRequestIds)
						.stream()
						.collect(Collectors.toMap(
								BackendRequest::getId,
								Function.identity()
						));

		return backendRequestIds.stream()
				.map(backendRequestsById::get)
				.map(this::toBackendRequestResponse)
				.toList();
	}

	@Transactional
	public List<TagResponse> replaceTags(
			Long scenarioId,
			ScenarioTagsRequest request
	) {
		findById(scenarioId);

		List<Long> tagIds = request.tagIds()
				.stream()
				.distinct()
				.toList();

		List<Tag> tags = tagRepository.findAllById(tagIds);

		if (tags.size() != tagIds.size()) {
			throw new EntityNotFoundException(
					"Один или несколько тегов не найдены"
			);
		}

		scenarioTagRepository.deleteAllByScenarioId(scenarioId);

		List<ScenarioTag> links = tagIds.stream()
				.map(tagId -> new ScenarioTag(scenarioId, tagId))
				.toList();

		scenarioTagRepository.saveAll(links);

		return getTags(scenarioId);
	}

	@Transactional
	public List<ScenarioBackendRequestResponse> replaceBackendRequests(
			Long scenarioId,
			ScenarioBackendRequestsRequest request
	) {
		findById(scenarioId);

		List<Long> backendRequestIds = request.backendRequestIds()
				.stream()
				.distinct()
				.toList();

		List<BackendRequest> existingBackendRequests =
				backendRequestRepository.findAllById(backendRequestIds);

		if (existingBackendRequests.size() != backendRequestIds.size()) {
			throw new EntityNotFoundException(
					"Один или несколько backend-запросов не найдены"
			);
		}

		scenarioBackendRequestRepository.deleteAllByScenarioId(scenarioId);

		List<ScenarioBackendRequest> links = backendRequestIds.stream()
				.map(backendRequestId -> new ScenarioBackendRequest(
						scenarioId,
						backendRequestId
				))
				.toList();

		scenarioBackendRequestRepository.saveAll(links);

		return getBackendRequests(scenarioId);
	}

	@Transactional
	public ScenarioResponse create(ScenarioRequest request) {
		ScenarioData data = prepareData(request);

		if (scenarioRepository.existsByNameIgnoreCase(data.name())) {
			throw new ScenarioAlreadyExistsException(data.name());
		}

		try {
			Scenario scenario = scenarioRepository.save(
					new Scenario(
							data.name(),
							data.description(),
							data.scenarioPayloadJson()
					)
			);

			return toResponse(scenario);
		} catch (DataIntegrityViolationException exception) {
			throw new ScenarioAlreadyExistsException(data.name());
		}
	}

	@Transactional
	public ScenarioResponse update(Long id, ScenarioRequest request) {
		Scenario scenario = findById(id);
		ScenarioData data = prepareData(request);

		boolean nameChanged = !scenario.getName()
				.equalsIgnoreCase(data.name());

		if (nameChanged
				&& scenarioRepository.existsByNameIgnoreCase(data.name())) {
			throw new ScenarioAlreadyExistsException(data.name());
		}

		try {
			scenario.update(
					data.name(),
					data.description(),
					data.scenarioPayloadJson()
			);

			return toResponse(scenario);
		} catch (DataIntegrityViolationException exception) {
			throw new ScenarioAlreadyExistsException(data.name());
		}
	}

	public List<ScenarioVariableResponse> getVariables(Long scenarioId) {
		findById(scenarioId);

		List<ScenarioVariable> links =
				scenarioVariableRepository
						.findAllByScenarioIdOrderByPositionAsc(scenarioId);

		Set<Long> variableIds = links.stream()
				.map(ScenarioVariable::getVariableId)
				.collect(Collectors.toSet());

		Map<Long, Variable> variablesById = variableRepository.findAllById(variableIds)
				.stream()
				.collect(Collectors.toMap(Variable::getId, Function.identity()));

		return links.stream()
				.map(link -> {
					Variable variable = variablesById.get(link.getVariableId());

					return new ScenarioVariableResponse(
							variable.getId(),
							variable.getName(),
							variable.getDescription(),
							variable.isUserVariable(),
							link.getPosition()
					);
				})
				.toList();
	}

	@Transactional
	public List<ScenarioVariableResponse> replaceVariables(
			Long scenarioId,
			ScenarioVariablesRequest request
	) {
		findById(scenarioId);

		validateVariableLinks(request.variables());

		scenarioVariableRepository.deleteAllByScenarioId(scenarioId);

		List<ScenarioVariable> newLinks = request.variables()
				.stream()
				.map(item -> new ScenarioVariable(
						scenarioId,
						item.variableId(),
						item.position()
				))
				.toList();

		scenarioVariableRepository.saveAll(newLinks);

		return getVariables(scenarioId);
	}

	@Transactional
	public void delete(Long id) {
		scenarioRepository.delete(findById(id));
	}

	public List<TagResponse> getTags(Long scenarioId) {
		findById(scenarioId);

		return scenarioTagRepository.findAllByScenarioId(scenarioId)
				.stream()
				.map(ScenarioTag::getTagId)
				.map(this::findTagById)
				.map(this::toTagResponse)
				.toList();
	}

	public List<ScenarioCustomMethodResponse> getCustomMethods(
			Long scenarioId
	) {
		findById(scenarioId);

		List<Long> targetScenarioIds = scenarioCustomMethodRepository
				.findAllBySourceScenarioId(scenarioId)
				.stream()
				.map(ScenarioCustomMethod::getTargetScenarioId)
				.toList();

		if (targetScenarioIds.isEmpty()) {
			return List.of();
		}

		Map<Long, Scenario> scenariosById =
				scenarioRepository.findAllById(targetScenarioIds)
						.stream()
						.collect(Collectors.toMap(
								Scenario::getId,
								Function.identity()
						));

		return targetScenarioIds.stream()
				.map(scenariosById::get)
				.map(this::toCustomMethodResponse)
				.toList();
	}

	@Transactional
	public List<ScenarioCustomMethodResponse> replaceCustomMethods(
			Long scenarioId,
			ScenarioCustomMethodsRequest request
	) {
		findById(scenarioId);

		List<Long> targetScenarioIds = request.targetScenarioIds()
				.stream()
				.distinct()
				.toList();

		if (targetScenarioIds.contains(scenarioId)) {
			throw new IllegalArgumentException(
					"Сценарий не может быть custom method самого себя"
			);
		}

		List<Scenario> targetScenarios =
				scenarioRepository.findAllById(targetScenarioIds);

		if (targetScenarios.size() != targetScenarioIds.size()) {
			throw new EntityNotFoundException(
					"Один или несколько связанных сценариев не найдены"
			);
		}

		scenarioCustomMethodRepository
				.deleteAllBySourceScenarioId(scenarioId);

		List<ScenarioCustomMethod> links = targetScenarioIds.stream()
				.map(targetScenarioId -> new ScenarioCustomMethod(
						scenarioId,
						targetScenarioId
				))
				.toList();

		scenarioCustomMethodRepository.saveAll(links);

		return getCustomMethods(scenarioId);
	}

	@Transactional
	public void addTag(Long scenarioId, Long tagId) {
		findById(scenarioId);
		findTagById(tagId);

		if (scenarioTagRepository.existsByScenarioIdAndTagId(scenarioId, tagId)) {
			return;
		}

		scenarioTagRepository.save(new ScenarioTag(scenarioId, tagId));
	}

	@Transactional
	public void removeTag(Long scenarioId, Long tagId) {
		findById(scenarioId);
		findTagById(tagId);

		scenarioTagRepository.deleteByScenarioIdAndTagId(scenarioId, tagId);
	}

	private ScenarioBackendRequestResponse toBackendRequestResponse(
			BackendRequest backendRequest
	) {
		return new ScenarioBackendRequestResponse(
				backendRequest.getId(),
				backendRequest.getName(),
				backendRequest.getUrl(),
				backendRequest.getHttpMethod()
		);
	}

	private Tag findTagById(Long id) {
		return tagRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Тег с id=%d не найден".formatted(id)
				));
	}

	private void validateVariableLinks(
			List<ScenarioVariableRequest> variables
	) {
		Set<Long> variableIds = new HashSet<>();
		Set<Integer> positions = new HashSet<>();

		for (ScenarioVariableRequest item : variables) {
			if (!variableIds.add(item.variableId())) {
				throw new IllegalArgumentException(
						"Одна переменная не может быть добавлена в сценарий дважды"
				);
			}

			if (!positions.add(item.position())) {
				throw new IllegalArgumentException(
						"Позиции переменных не должны повторяться"
				);
			}
		}

		List<Variable> existingVariables =
				variableRepository.findAllById(variableIds);

		if (existingVariables.size() != variableIds.size()) {
			throw new EntityNotFoundException(
					"Одна или несколько переменных не найдены"
			);
		}
	}

	private TagResponse toTagResponse(Tag tag) {
		return new TagResponse(
				tag.getId(),
				tag.getName(),
				tag.getColor(),
				tag.getCreatedAt(),
				tag.getUpdatedAt()
		);
	}

	private Scenario findById(Long id) {
		return scenarioRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Сценарий с id=%d не найден".formatted(id)
				));
	}

	private ScenarioData prepareData(ScenarioRequest request) {
		return new ScenarioData(
				normalizeName(request.name()),
				normalizeDescription(request.description()),
				normalizeScenarioJson(request.scenarioPayloadJson())
		);
	}

	private String normalizeName(String value) {
		return value.trim().replaceAll("\\s+", " ");
	}

	private String normalizeDescription(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}

		return value.trim();
	}

	private String normalizeScenarioJson(String value) {
		try {
			JsonNode root = objectMapper.readTree(value);

			if (root == null || !root.isObject()) {
				throw new ScenarioJsonInvalidException();
			}

			/*
			 * На этом этапе backendRequests должен уже быть удалён
			 * импортером до передачи payload сюда.
			 * Пока просто сохраняем то, что пришло.
			 */
			return objectMapper.writeValueAsString(root);
		} catch (JsonProcessingException exception) {
			throw new ScenarioJsonInvalidException();
		}
	}

	private ScenarioResponse toResponse(Scenario scenario) {
		return new ScenarioResponse(
				scenario.getId(),
				scenario.getName(),
				scenario.getDescription(),
				scenario.getScenarioPayloadJson(),
				scenario.getCreatedAt(),
				scenario.getUpdatedAt()
		);
	}

	private ScenarioCustomMethodResponse toCustomMethodResponse(
			Scenario scenario
	) {
		return new ScenarioCustomMethodResponse(
				scenario.getId(),
				scenario.getName(),
				scenario.getDescription()
		);
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

	private List<MissingUserVariableResponse> findMissingUserVariables(
			List<ScenarioVariable> scenarioVariables,
			Map<Long, Variable> variablesById,
			Map<Long, UserVariable> userValuesByVariableId
	) {
		return scenarioVariables.stream()
				.map(ScenarioVariable::getVariableId)
				.map(variablesById::get)
				.filter(Variable::isUserVariable)
				.filter(variable -> !userValuesByVariableId.containsKey(
						variable.getId()
				))
				.map(variable -> new MissingUserVariableResponse(
						variable.getId(),
						variable.getName(),
						variable.getDescription()
				))
				.toList();
	}

	private void replaceUserVariableValues(
			ObjectNode root,
			Map<String, Variable> variablesByName,
			Map<Long, UserVariable> userValuesByVariableId
	) {
		JsonNode variablesNode = root.get("variables");

		if (variablesNode == null || !variablesNode.isArray()) {
			return;
		}

		for (JsonNode node : variablesNode) {
			if (!node.isObject()) {
				continue;
			}

			ObjectNode variableNode = (ObjectNode) node;
			String variableName = variableNode.path("name").asText();

			Variable variable = variablesByName.get(variableName);

			if (variable == null || !variable.isUserVariable()) {
				continue;
			}

			UserVariable userVariable =
					userValuesByVariableId.get(variable.getId());

			variableNode.put("value", userVariable.getValue());
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

		if (!backendRequestIds.isEmpty()) {
			Map<Long, BackendRequest> backendRequestsById =
					backendRequestRepository.findAllById(backendRequestIds)
							.stream()
							.collect(Collectors.toMap(
									BackendRequest::getId,
									Function.identity()
							));

			for (Long backendRequestId : backendRequestIds) {
				BackendRequest backendRequest =
						backendRequestsById.get(backendRequestId);

				if (backendRequest == null) {
					throw new IllegalStateException(
							"Не найден связанный backend-запрос с id=%d"
									.formatted(backendRequestId)
					);
				}

				backendRequestsNode.add(
						backendRequestExportMapper.toJson(backendRequest)
				);
			}
		}

		root.set("backendRequests", backendRequestsNode);
	}

	private String serializeJson(ObjectNode root) {
		try {
			return objectMapper.writerWithDefaultPrettyPrinter()
					.writeValueAsString(root);
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException(
					"Не удалось сериализовать сценарий",
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

	private record ScenarioData(
			String name,
			String description,
			String scenarioPayloadJson
	) {
	}
}