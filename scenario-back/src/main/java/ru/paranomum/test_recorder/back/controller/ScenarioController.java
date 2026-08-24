package ru.paranomum.test_recorder.back.controller;

import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.paranomum.test_recorder.back.dto.scenarios.*;
import ru.paranomum.test_recorder.back.security.CustomUserDetails;
import ru.paranomum.test_recorder.back.service.ScenarioService;
import ru.paranomum.test_recorder.back.dto.tags.TagResponse;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/scenarios")
public class ScenarioController {

	private final ScenarioService scenarioService;

	public ScenarioController(ScenarioService scenarioService) {
		this.scenarioService = scenarioService;
	}

	@GetMapping
	public List<ScenarioResponse> getAll(
			@RequestParam(required = false) String query,
			@RequestParam(required = false) List<Long> tagIds
	) {
		return scenarioService.getAll(query, tagIds);
	}

	@GetMapping("/{id}")
	public ScenarioResponse getById(@PathVariable Long id) {
		return scenarioService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ScenarioResponse create(
			@Valid @RequestBody ScenarioRequest request
	) {
		return scenarioService.create(request);
	}

	@PutMapping("/{id}")
	public ScenarioResponse update(
			@PathVariable Long id,
			@Valid @RequestBody ScenarioRequest request
	) {
		return scenarioService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		scenarioService.delete(id);
	}

	@GetMapping("/{scenarioId}/tags")
	public List<TagResponse> getTags(@PathVariable Long scenarioId) {
		return scenarioService.getTags(scenarioId);
	}

	@PostMapping("/{scenarioId}/tags/{tagId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void addTag(
			@PathVariable Long scenarioId,
			@PathVariable Long tagId
	) {
		scenarioService.addTag(scenarioId, tagId);
	}

	@DeleteMapping("/{scenarioId}/tags/{tagId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeTag(
			@PathVariable Long scenarioId,
			@PathVariable Long tagId
	) {
		scenarioService.removeTag(scenarioId, tagId);
	}

	@GetMapping("/{scenarioId}/variables")
	public List<ScenarioVariableResponse> getVariables(
			@PathVariable Long scenarioId
	) {
		return scenarioService.getVariables(scenarioId);
	}

	@PutMapping("/{scenarioId}/variables")
	public List<ScenarioVariableResponse> replaceVariables(
			@PathVariable Long scenarioId,
			@Valid @RequestBody ScenarioVariablesRequest request
	) {
		return scenarioService.replaceVariables(scenarioId, request);
	}

	@GetMapping("/{scenarioId}/backend-requests")
	public List<ScenarioBackendRequestResponse> getBackendRequests(
			@PathVariable Long scenarioId
	) {
		return scenarioService.getBackendRequests(scenarioId);
	}

	@PutMapping("/{scenarioId}/backend-requests")
	public List<ScenarioBackendRequestResponse> replaceBackendRequests(
			@PathVariable Long scenarioId,
			@Valid @RequestBody ScenarioBackendRequestsRequest request
	) {
		return scenarioService.replaceBackendRequests(scenarioId, request);
	}

	@GetMapping("/{scenarioId}/custom-methods")
	public List<ScenarioCustomMethodResponse> getCustomMethods(
			@PathVariable Long scenarioId
	) {
		return scenarioService.getCustomMethods(scenarioId);
	}

	@PutMapping("/{scenarioId}/custom-methods")
	public List<ScenarioCustomMethodResponse> replaceCustomMethods(
			@PathVariable Long scenarioId,
			@Valid @RequestBody ScenarioCustomMethodsRequest request
	) {
		return scenarioService.replaceCustomMethods(scenarioId, request);
	}

	@PutMapping("/{scenarioId}/tags")
	public List<TagResponse> replaceTags(
			@PathVariable Long scenarioId,
			@Valid @RequestBody ScenarioTagsRequest request
	) {
		return scenarioService.replaceTags(scenarioId, request);
	}

	@GetMapping("/{scenarioId}/download")
	public ResponseEntity<ByteArrayResource> download(
			@PathVariable Long scenarioId,
			@AuthenticationPrincipal CustomUserDetails currentUser
	) {
		ScenarioDownloadResult result = scenarioService.downloadScenario(
				scenarioId,
				currentUser.getUserId()
		);

		byte[] bytes = result.content().getBytes(StandardCharsets.UTF_8);

		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.contentLength(bytes.length)
				.header(
						HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"" + result.fileName() + "\""
				)
				.body(new ByteArrayResource(bytes));
	}
}