package ru.paranomum.test_recorder.back.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestRequest;
import ru.paranomum.test_recorder.back.dto.backendrequests.BackendRequestResponse;
import ru.paranomum.test_recorder.back.service.BackendRequestService;

import java.util.List;

@RestController
@RequestMapping("/api/backend-requests")
public class BackendRequestController {

	private final BackendRequestService backendRequestService;

	public BackendRequestController(
			BackendRequestService backendRequestService
	) {
		this.backendRequestService = backendRequestService;
	}

	@GetMapping
	public List<BackendRequestResponse> getAll(
			@RequestParam(required = false) String query
	) {
		return backendRequestService.getAll(query);
	}

	@GetMapping("/{id}")
	public BackendRequestResponse getById(@PathVariable Long id) {
		return backendRequestService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public BackendRequestResponse create(
			@Valid @RequestBody BackendRequestRequest request
	) {
		return backendRequestService.create(request);
	}

	@PutMapping("/{id}")
	public BackendRequestResponse update(
			@PathVariable Long id,
			@Valid @RequestBody BackendRequestRequest request
	) {
		return backendRequestService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		backendRequestService.delete(id);
	}

	@PostMapping("/batch")
	@ResponseStatus(HttpStatus.CREATED)
	public List<BackendRequestResponse> createBatch(
			@Valid @RequestBody List<BackendRequestRequest> requests
	) {
		return backendRequestService.createBatch(requests);
	}
}