package ru.paranomum.test_recorder.back.controller;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ru.paranomum.test_recorder.back.exception.*;

import java.net.URI;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(TagAlreadyExistsException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public ProblemDetail handleTagAlreadyExists(TagAlreadyExistsException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONFLICT,
				exception.getMessage()
		);
		problem.setTitle("Тег уже существует");
		problem.setType(URI.create("/problems/tag-already-exists"));
		return problem;
	}

	@ExceptionHandler(EntityNotFoundException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public ProblemDetail handleNotFound(EntityNotFoundException exception) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.NOT_FOUND,
				exception.getMessage()
		);
		problem.setTitle("Ресурс не найден");
		return problem;
	}

	@ExceptionHandler(VariableAlreadyExistsException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public ProblemDetail handleVariableAlreadyExists(
			VariableAlreadyExistsException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONFLICT,
				exception.getMessage()
		);

		problem.setTitle("Переменная уже существует");
		problem.setType(
				URI.create("/problems/variable-already-exists")
		);

		return problem;
	}

	@ExceptionHandler(BackendRequestAlreadyExistsException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public ProblemDetail handleBackendRequestAlreadyExists(
			BackendRequestAlreadyExistsException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONFLICT,
				exception.getMessage()
		);

		problem.setTitle("Backend-запрос уже существует");
		problem.setType(
				URI.create("/problems/backend-request-already-exists")
		);

		return problem;
	}

	@ExceptionHandler(BackendRequestJsonInvalidException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ProblemDetail handleBackendRequestJsonInvalid(
			BackendRequestJsonInvalidException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				exception.getMessage()
		);

		problem.setTitle("Некорректный JSON");
		problem.setType(
				URI.create("/problems/backend-request-json-invalid")
		);

		return problem;
	}

	@ExceptionHandler(UserAlreadyExistsException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public ProblemDetail handleUserAlreadyExists(
			UserAlreadyExistsException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONFLICT,
				exception.getMessage()
		);

		problem.setTitle("Пользователь уже существует");
		problem.setType(
				URI.create("/problems/user-already-exists")
		);

		return problem;
	}

	@ExceptionHandler(ScenarioAlreadyExistsException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public ProblemDetail handleScenarioAlreadyExists(
			ScenarioAlreadyExistsException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONFLICT,
				exception.getMessage()
		);

		problem.setTitle("Сценарий уже существует");
		problem.setType(
				URI.create("/problems/scenario-already-exists")
		);

		return problem;
	}

	@ExceptionHandler(ScenarioJsonInvalidException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ProblemDetail handleScenarioJsonInvalid(
			ScenarioJsonInvalidException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				exception.getMessage()
		);

		problem.setTitle("Некорректный JSON сценария");
		problem.setType(
				URI.create("/problems/scenario-json-invalid")
		);

		return problem;
	}

	@ExceptionHandler(VariableIsNotUserVariableException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ProblemDetail handleVariableIsNotUserVariable(
			VariableIsNotUserVariableException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				exception.getMessage()
		);

		problem.setTitle("Недопустимая пользовательская переменная");
		problem.setType(
				URI.create("/problems/variable-is-not-user-variable")
		);

		return problem;
	}

	@ExceptionHandler(InvalidCredentialsException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public ProblemDetail handleInvalidCredentials(
			InvalidCredentialsException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.UNAUTHORIZED,
				exception.getMessage()
		);

		problem.setTitle("Ошибка авторизации");
		problem.setType(
				URI.create("/problems/invalid-credentials")
		);

		return problem;
	}

	@ExceptionHandler(IllegalArgumentException.class)
	@ResponseStatus(HttpStatus.BAD_REQUEST)
	public ProblemDetail handleIllegalArgument(
			IllegalArgumentException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.BAD_REQUEST,
				exception.getMessage()
		);

		problem.setTitle("Некорректные данные");
		problem.setType(
				URI.create("/problems/invalid-request")
		);

		return problem;
	}

	@ExceptionHandler(MissingUserVariablesException.class)
	@ResponseStatus(HttpStatus.CONFLICT)
	public ProblemDetail handleMissingUserVariables(
			MissingUserVariablesException exception
	) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.CONFLICT,
				exception.getMessage()
		);

		problem.setTitle("Не заполнены пользовательские переменные");
		problem.setType(
				URI.create("/problems/missing-user-variables")
		);

		problem.setProperty(
				"missingVariables",
				exception.getMissingVariables()
		);

		return problem;
	}
}