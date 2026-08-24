package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

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

	@Column(nullable = false)
	private Integer position;

	protected ScenarioVariable() {
	}

	public ScenarioVariable(
			Long scenarioId,
			Long variableId,
			Integer position
	) {
		this.scenarioId = scenarioId;
		this.variableId = variableId;
		this.position = position;
	}

	public Long getScenarioId() {
		return scenarioId;
	}

	public Long getVariableId() {
		return variableId;
	}

	public Integer getPosition() {
		return position;
	}
}