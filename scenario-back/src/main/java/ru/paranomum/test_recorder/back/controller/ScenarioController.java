package ru.paranomum.test_recorder.back.controller;

import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioBackendRequestResponse;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioBackendRequestsRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioCustomMethodResponse;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioCustomMethodsRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioDownloadResult;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioResponse;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioTagsRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioVariableResponse;
import ru.paranomum.test_recorder.back.dto.scenarios.ScenarioVariablesRequest;
import ru.paranomum.test_recorder.back.dto.scenarios.imports.ScenarioImportRequest;
import ru.paranomum.test_recorder.back.dto.tags.TagResponse;
import ru.paranomum.test_recorder.back.security.CustomUserDetails;
import ru.paranomum.test_recorder.back.service.ScenarioExportService;
import ru.paranomum.test_recorder.back.service.ScenarioImportService;
import ru.paranomum.test_recorder.back.service.ScenarioService;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/scenarios")
public class ScenarioController {

	private final ScenarioService scenarioService;
	private final ScenarioExportService scenarioExportService;
	private final ScenarioImportService scenarioImportService;

	public ScenarioController(
			ScenarioService scenarioService,
			ScenarioExportService scenarioExportService,
			ScenarioImportService scenarioImportService
	) {
		this.scenarioService = scenarioService;
		this.scenarioExportService = scenarioExportService;
		this.scenarioImportService = scenarioImportService;
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

	@PostMapping("/import")
	@ResponseStatus(HttpStatus.CREATED)
	public ScenarioResponse importScenario(
			@Valid @RequestBody ScenarioImportRequest request
	) {
		return scenarioImportService.importScenario(request);
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
		return scenarioService.replaceBackendRequests(
				scenarioId,
				request
		);
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
		return scenarioService.replaceCustomMethods(
				scenarioId,
				request
		);
	}

	@PutMapping("/{scenarioId}/tags")
	public List<TagResponse> replaceTags(
			@PathVariable Long scenarioId,
			@Valid @RequestBody ScenarioTagsRequest request
	) {
		return scenarioService.replaceTags(scenarioId, request);
	}

	@GetMapping("/{scenarioId}/download-original")
	public ResponseEntity<ByteArrayResource> downloadOriginal(
			@PathVariable Long scenarioId,
			@AuthenticationPrincipal CustomUserDetails currentUser
	) {
		ScenarioDownloadResult result =
				scenarioExportService.downloadOriginal(
						scenarioId,
						currentUser.getUserId()
				);

		return jsonDownloadResponse(result);
	}

	@GetMapping("/{scenarioId}/download-full")
	public ResponseEntity<ByteArrayResource> downloadFull(
			@PathVariable Long scenarioId,
			@AuthenticationPrincipal CustomUserDetails currentUser
	) {
		ScenarioDownloadResult result =
				scenarioExportService.downloadFull(
						scenarioId,
						currentUser.getUserId()
				);

		return jsonDownloadResponse(result);
	}

	@GetMapping("/{scenarioId}/download-zip")
	public ResponseEntity<ByteArrayResource> downloadZip(
			@PathVariable Long scenarioId,
			@AuthenticationPrincipal CustomUserDetails currentUser
	) {
		List<ScenarioDownloadResult> entries =
				scenarioExportService.downloadZipEntries(
						scenarioId,
						currentUser.getUserId()
				);

		byte[] zipBytes = createZip(entries);

		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType("application/zip"))
				.contentLength(zipBytes.length)
				.header(
						HttpHeaders.CONTENT_DISPOSITION,
						"attachment; filename=\"scenario-" + scenarioId + ".zip\""
				)
				.body(new ByteArrayResource(zipBytes));
	}

	private ResponseEntity<ByteArrayResource> jsonDownloadResponse(
			ScenarioDownloadResult result
	) {
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

	private byte[] createZip(
			List<ScenarioDownloadResult> entries
	) {
		try (
				ByteArrayOutputStream outputStream =
						new ByteArrayOutputStream();
				ZipOutputStream zipOutputStream =
						new ZipOutputStream(
								outputStream,
								StandardCharsets.UTF_8
						)
		) {
			for (ScenarioDownloadResult entry : entries) {
				ZipEntry zipEntry = new ZipEntry(entry.fileName());

				zipOutputStream.putNextEntry(zipEntry);

				zipOutputStream.write(
						entry.content().getBytes(StandardCharsets.UTF_8)
				);

				zipOutputStream.closeEntry();
			}

			zipOutputStream.finish();

			return outputStream.toByteArray();
		} catch (IOException exception) {
			throw new IllegalStateException(
					"Не удалось сформировать ZIP-архив сценариев",
					exception
			);
		}
	}
}