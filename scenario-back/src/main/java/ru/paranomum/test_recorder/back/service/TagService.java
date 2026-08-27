package ru.paranomum.test_recorder.back.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.tags.TagRequest;
import ru.paranomum.test_recorder.back.dto.tags.TagResponse;
import ru.paranomum.test_recorder.back.entity.Tag;
import ru.paranomum.test_recorder.back.exception.TagAlreadyExistsException;
import ru.paranomum.test_recorder.back.repository.TagRepository;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TagService {

	private static final String DEFAULT_TAG_COLOR = "#6B7280";

	private final TagRepository tagRepository;

	public TagService(TagRepository tagRepository) {
		this.tagRepository = tagRepository;
	}

	public List<TagResponse> getAll(String query) {
		List<Tag> tags = query == null || query.isBlank()
				? tagRepository.findAllByOrderByNameAsc()
				: tagRepository.findAllByNameContainingIgnoreCaseOrderByNameAsc(
				query.trim()
		);

		return tags.stream()
				.map(this::toResponse)
				.toList();
	}

	public TagResponse getById(Long id) {
		return toResponse(findById(id));
	}

	@Transactional
	public TagResponse create(TagRequest request) {
		String name = normalizeName(request.name());

		if (tagRepository.existsByNameIgnoreCase(name)) {
			throw new TagAlreadyExistsException(name);
		}

		try {
			Tag tag = tagRepository.save(
					new Tag(name, DEFAULT_TAG_COLOR)
			);

			return toResponse(tag);
		} catch (DataIntegrityViolationException exception) {
			throw new TagAlreadyExistsException(name);
		}
	}

	@Transactional
	public TagResponse update(Long id, TagRequest request) {
		Tag tag = findById(id);
		String name = normalizeName(request.name());

		boolean nameChanged = !tag.getName().equalsIgnoreCase(name);

		if (nameChanged && tagRepository.existsByNameIgnoreCase(name)) {
			throw new TagAlreadyExistsException(name);
		}

		String color = request.color() == null
				? tag.getColor()
				: request.color();

		try {
			tag.update(name, color);

			return toResponse(tag);
		} catch (DataIntegrityViolationException exception) {
			throw new TagAlreadyExistsException(name);
		}
	}

	@Transactional
	public void delete(Long id) {
		tagRepository.delete(findById(id));
	}

	private Tag findById(Long id) {
		return tagRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Тег с id=%d не найден".formatted(id)
				));
	}

	private String normalizeName(String name) {
		return name.trim().replaceAll("\\s+", " ");
	}

	private TagResponse toResponse(Tag tag) {
		return new TagResponse(
				tag.getId(),
				tag.getName(),
				tag.getColor()
		);
	}
}