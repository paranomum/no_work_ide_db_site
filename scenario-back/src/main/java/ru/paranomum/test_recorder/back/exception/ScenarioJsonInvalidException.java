package ru.paranomum.test_recorder.back.exception;

public class ScenarioJsonInvalidException extends RuntimeException {

	public ScenarioJsonInvalidException() {
		super("Поле scenarioPayloadJson должно содержать валидный JSON-объект");
	}
}