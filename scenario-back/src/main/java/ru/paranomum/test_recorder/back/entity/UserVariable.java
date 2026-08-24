package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_variables")
@IdClass(UserVariableId.class)
public class UserVariable {

	@Id
	@Column(name = "user_id")
	private Long userId;

	@Id
	@Column(name = "variable_id")
	private Long variableId;

	@Column(nullable = false)
	private String value;

	protected UserVariable() {
	}

	public UserVariable(
			Long userId,
			Long variableId,
			String value
	) {
		this.userId = userId;
		this.variableId = variableId;
		this.value = value;
	}

	public Long getUserId() {
		return userId;
	}

	public Long getVariableId() {
		return variableId;
	}

	public String getValue() {
		return value;
	}

	public void updateValue(String value) {
		this.value = value;
	}
}