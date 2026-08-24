package ru.paranomum.test_recorder.back.exception;

public class ScenarioAlreadyExistsException extends RuntimeException {

	public ScenarioAlreadyExistsException(String name) {
		super("Сценарий с названием «%s» уже существует".formatted(name));
	}
}