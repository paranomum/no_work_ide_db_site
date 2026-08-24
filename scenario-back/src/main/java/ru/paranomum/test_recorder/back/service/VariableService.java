package ru.paranomum.test_recorder.back.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.variables.VariableRequest;
import ru.paranomum.test_recorder.back.dto.variables.VariableResponse;
import ru.paranomum.test_recorder.back.entity.Variable;
import ru.paranomum.test_recorder.back.exception.VariableAlreadyExistsException;
import ru.paranomum.test_recorder.back.repository.VariableRepository;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class VariableService {

	private final VariableRepository variableRepository;

	public VariableService(VariableRepository variableRepository) {
		this.variableRepository = variableRepository;
	}

	public List<VariableResponse> getAll(String query) {
		List<Variable> variables = query == null || query.isBlank()
				? variableRepository.findAllByOrderByNameAsc()
				: variableRepository
				.findAllByNameContainingIgnoreCaseOrderByNameAsc(
						query.trim()
				);

		return variables.stream()
				.map(this::toResponse)
				.toList();
	}

	public VariableResponse getById(Long id) {
		return toResponse(findById(id));
	}

	@Transactional
	public VariableResponse create(VariableRequest request) {
		String name = normalizeName(request.name());
		String description = normalizeDescription(request.description());

		if (variableRepository.existsByNameIgnoreCase(name)) {
			throw new VariableAlreadyExistsException(name);
		}

		try {
			Variable variable = variableRepository.save(
					new Variable(name, description, request.isUserVariable())
			);

			return toResponse(variable);
		} catch (DataIntegrityViolationException exception) {
			throw new VariableAlreadyExistsException(name);
		}
	}

	@Transactional
	public VariableResponse update(Long id, VariableRequest request) {
		Variable variable = findById(id);

		String name = normalizeName(request.name());
		String description = normalizeDescription(request.description());

		boolean nameChanged = !variable.getName().equalsIgnoreCase(name);

		if (nameChanged && variableRepository.existsByNameIgnoreCase(name)) {
			throw new VariableAlreadyExistsException(name);
		}

		try {
			variable.update(
					name,
					description,
					request.isUserVariable()
			);

			return toResponse(variable);
		} catch (DataIntegrityViolationException exception) {
			throw new VariableAlreadyExistsException(name);
		}
	}

	@Transactional
	public void delete(Long id) {
		variableRepository.delete(findById(id));
	}

	private Variable findById(Long id) {
		return variableRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Переменная с id=%d не найдена".formatted(id)
				));
	}

	private String normalizeName(String name) {
		return name.trim().replaceAll("\\s+", " ");
	}

	private String normalizeDescription(String description) {
		if (description == null || description.isBlank()) {
			return null;
		}

		return description.trim();
	}

	private VariableResponse toResponse(Variable variable) {
		return new VariableResponse(
				variable.getId(),
				variable.getName(),
				variable.getDescription(),
				variable.isUserVariable(),
				variable.getCreatedAt(),
				variable.getUpdatedAt()
		);
	}
}