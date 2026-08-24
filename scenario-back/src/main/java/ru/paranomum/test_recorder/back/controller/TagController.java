package ru.paranomum.test_recorder.back.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ru.paranomum.test_recorder.back.dto.tags.TagRequest;
import ru.paranomum.test_recorder.back.dto.tags.TagResponse;
import ru.paranomum.test_recorder.back.service.TagService;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

	private final TagService tagService;

	public TagController(TagService tagService) {
		this.tagService = tagService;
	}

	@GetMapping
	public List<TagResponse> getAll(
			@RequestParam(required = false) String query
	) {
		return tagService.getAll(query);
	}

	@GetMapping("/{id}")
	public TagResponse getById(@PathVariable Long id) {
		return tagService.getById(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TagResponse create(
			@Valid @RequestBody TagRequest request
	) {
		return tagService.create(request);
	}

	@PutMapping("/{id}")
	public TagResponse update(
			@PathVariable Long id,
			@Valid @RequestBody TagRequest request
	) {
		return tagService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		tagService.delete(id);
	}
}