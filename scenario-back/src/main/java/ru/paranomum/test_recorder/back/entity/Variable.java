package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "variables")
public class Variable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column
	private String description;

	@Column(name = "is_user_variable", nullable = false)
	private boolean isUserVariable;

	public Variable() {
	}

	public Variable(
			String name,
			String description,
			boolean isUserVariable
	) {
		this.name = name;
		this.description = description;
		this.isUserVariable = isUserVariable;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getDescription() {
		return description;
	}

	public boolean isUserVariable() {
		return isUserVariable;
	}

	public void update(
			String name,
			String description,
			boolean isUserVariable
	) {
		this.name = name;
		this.description = description;
		this.isUserVariable = isUserVariable;
	}
}