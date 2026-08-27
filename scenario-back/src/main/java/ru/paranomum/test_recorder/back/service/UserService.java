package ru.paranomum.test_recorder.back.service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.paranomum.test_recorder.back.dto.users.*;
import ru.paranomum.test_recorder.back.entity.User;
import ru.paranomum.test_recorder.back.exception.InvalidCredentialsException;
import ru.paranomum.test_recorder.back.exception.UserAlreadyExistsException;
import ru.paranomum.test_recorder.back.repository.UserRepository;

import ru.paranomum.test_recorder.back.entity.UserVariable;
import ru.paranomum.test_recorder.back.entity.UserVariableId;
import ru.paranomum.test_recorder.back.entity.Variable;
import ru.paranomum.test_recorder.back.exception.VariableIsNotUserVariableException;
import ru.paranomum.test_recorder.back.repository.UserVariableRepository;
import ru.paranomum.test_recorder.back.repository.VariableRepository;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	private final VariableRepository variableRepository;
	private final UserVariableRepository userVariableRepository;

	public UserService(
			UserRepository userRepository,
			VariableRepository variableRepository,
			UserVariableRepository userVariableRepository,
			PasswordEncoder passwordEncoder
	) {
		this.userRepository = userRepository;
		this.variableRepository = variableRepository;
		this.userVariableRepository = userVariableRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public List<UserResponse> getAll(String query) {
		List<User> users = query == null || query.isBlank()
				? userRepository.findAllByOrderByUsernameAsc()
				: userRepository
				.findAllByUsernameContainingIgnoreCaseOrderByUsernameAsc(
						query.trim()
				);

		return users.stream()
				.map(this::toResponse)
				.toList();
	}

	public UserResponse getById(Long id) {
		return toResponse(findById(id));
	}

	@Transactional
	public UserResponse create(UserRequest request) {
		String name = normalizeName(request.name());
		String username = normalizeUsername(request.username());

		if (userRepository.existsByUsernameIgnoreCase(username)) {
			throw new UserAlreadyExistsException(username);
		}

		try {
			User user = userRepository.save(
					new User(
							name,
							username,
							passwordEncoder.encode(request.password())
					)
			);

			return toResponse(user);
		} catch (DataIntegrityViolationException exception) {
			throw new UserAlreadyExistsException(username);
		}
	}

	@Transactional
	public UserResponse update(Long id, UserUpdateRequest request) {
		User user = findById(id);

		String name = normalizeName(request.name());
		String username = normalizeUsername(request.username());

		boolean usernameChanged = !user.getUsername()
				.equalsIgnoreCase(username);

		if (usernameChanged
				&& userRepository.existsByUsernameIgnoreCase(username)) {
			throw new UserAlreadyExistsException(username);
		}

		try {
			user.update(name, username);
			return toResponse(user);
		} catch (DataIntegrityViolationException exception) {
			throw new UserAlreadyExistsException(username);
		}
	}

	@Transactional
	public void updatePassword(Long id, UserPasswordRequest request) {
		User user = findById(id);
		user.updatePasswordHash(passwordEncoder.encode(request.password()));
	}

	private User findById(Long id) {
		return userRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Пользователь с id=%d не найден".formatted(id)
				));
	}

	public List<UserVariableResponse> getVariables(Long userId) {
		findById(userId);

		Map<Long, UserVariable> valuesByVariableId = userVariableRepository
				.findAllByUserId(userId)
				.stream()
				.collect(Collectors.toMap(
						UserVariable::getVariableId,
						Function.identity()
				));

		return variableRepository.findAllByIsUserVariableTrueOrderByNameAsc()
				.stream()
				.map(variable -> {
					UserVariable userVariable = valuesByVariableId.get(
							variable.getId()
					);

					return new UserVariableResponse(
							variable.getId(),
							variable.getName(),
							variable.getDescription(),
							userVariable == null ? null : userVariable.getValue(),
							userVariable != null
					);
				})
				.toList();
	}

	@Transactional
	public void setVariable(
			Long userId,
			Long variableId,
			UserVariableRequest request
	) {
		findById(userId);
		Variable variable = findVariableById(variableId);

		if (!variable.isUserVariable()) {
			throw new VariableIsNotUserVariableException(variable.getName());
		}

		UserVariableId id = new UserVariableId(userId, variableId);

		userVariableRepository.findById(id)
				.ifPresentOrElse(
						userVariable -> userVariable.updateValue(request.value()),
						() -> userVariableRepository.save(
								new UserVariable(
										userId,
										variableId,
										request.value()
								)
						)
				);
	}

	@Transactional
	public void deleteVariable(Long userId, Long variableId) {
		findById(userId);

		Variable variable = findVariableById(variableId);

		if (!variable.isUserVariable()) {
			throw new VariableIsNotUserVariableException(variable.getName());
		}

		userVariableRepository.deleteById(
				new UserVariableId(userId, variableId)
		);
	}

	@Transactional
	public void resetAccount(Long userId) {
		findById(userId);
		userVariableRepository.deleteAllByUserId(userId);
	}

	public LoginResponse login(LoginRequest request) {
		String username = normalizeUsername(request.username());

		User user = userRepository.findByUsernameIgnoreCase(username)
				.orElseThrow(InvalidCredentialsException::new);

		if (!passwordEncoder.matches(
				request.password(),
				user.getPasswordHash()
		)) {
			throw new InvalidCredentialsException();
		}

		return new LoginResponse(
				user.getId(),
				user.getUsername()
		);
	}

	public UserResponse getCurrentUser(Long userId) {
		return toResponse(findById(userId));
	}

	private Variable findVariableById(Long id) {
		return variableRepository.findById(id)
				.orElseThrow(() -> new EntityNotFoundException(
						"Переменная с id=%d не найдена".formatted(id)
				));
	}

	private String normalizeName(String value) {
		return value.trim().replaceAll("\\s+", " ");
	}

	private String normalizeUsername(String value) {
		return value.trim();
	}

	private UserResponse toResponse(User user) {
		return new UserResponse(
				user.getId(),
				user.getName(),
				user.getUsername()
		);
	}
}