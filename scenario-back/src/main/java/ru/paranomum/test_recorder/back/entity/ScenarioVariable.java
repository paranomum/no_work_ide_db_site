package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "scenario_variables")
@IdClass(ScenarioVariableId.class)
public class ScenarioVariable {

	@Id
	@Column(name = "scenario_id")
	private Long scenarioId;

	@Id
	@Column(name = "variable_id")
	private Long variableId;

	@Column(name = "default_value", nullable = false)
	private String defaultValue;

	@Column(nullable = false)
	private Integer position;

	protected ScenarioVariable() {
	}

	public ScenarioVariable(
			Long scenarioId,
			Long variableId,
			String defaultValue,
			Integer position
	) {
		this.scenarioId = scenarioId;
		this.variableId = variableId;
		this.defaultValue = defaultValue;
		this.position = position;
	}

	public Long getScenarioId() {
		return scenarioId;
	}

	public Long getVariableId() {
		return variableId;
	}

	public String getDefaultValue() {
		return defaultValue;
	}

	public Integer getPosition() {
		return position;
	}

	public void updateDefaultValue(String defaultValue) {
		this.defaultValue = defaultValue;
	}
}