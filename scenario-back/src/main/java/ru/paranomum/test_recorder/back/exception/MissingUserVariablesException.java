package ru.paranomum.test_recorder.back.exception;

import ru.paranomum.test_recorder.back.dto.scenarios.MissingUserVariableResponse;

import java.util.List;

public class MissingUserVariablesException extends RuntimeException {

	private final List<MissingUserVariableResponse> missingVariables;

	public MissingUserVariablesException(
			List<MissingUserVariableResponse> missingVariables
	) {
		super("Не заполнены пользовательские переменные");
		this.missingVariables = missingVariables;
	}

	public List<MissingUserVariableResponse> getMissingVariables() {
		return missingVariables;
	}
}