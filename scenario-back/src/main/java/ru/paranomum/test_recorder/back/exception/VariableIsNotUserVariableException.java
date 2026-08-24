package ru.paranomum.test_recorder.back.exception;

public class VariableIsNotUserVariableException extends RuntimeException {

	public VariableIsNotUserVariableException(String variableName) {
		super(
				"Переменная «%s» не является пользовательской"
						.formatted(variableName)
		);
	}
}