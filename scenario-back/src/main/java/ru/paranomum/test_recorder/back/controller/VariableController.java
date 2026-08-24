package ru.paranomum.test_recorder.back.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.paranomum.test_recorder.back.dto.variables.VariableRequest;
import ru.paranomum.test_recorder.back.dto.variables.VariableResponse;
import ru.paranomum.test_recorder.back.service.VariableService;

import java.util.List;

@RestController
@RequestMapping("/api/variables")
public class VariableController {

	private final VariableService variableService;

	public VariableController(VariableService variableService) {
		this.variableService = variableService;
	}

	@GetMapping
	public List<VariableResponse> getAll(
			@RequestParam(required = false) String query
	) {
		return variableService.getAll(query);
	}

	@GetMapping("/{id}")
	public VariableResponse getById(@PathVariable Long id) {
		return variableService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public VariableResponse create(
			@Valid @RequestBody VariableRequest request
	) {
		return variableService.create(request);
	}

	@PutMapping("/{id}")
	public VariableResponse update(
			@PathVariable Long id,
			@Valid @RequestBody VariableRequest request
	) {
		return variableService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		variableService.delete(id);
	}
}