package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
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

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	protected Variable() {
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

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void update(
			String name,
			String description,
			boolean isUserVariable
	) {
		this.name = name;
		this.description = description;
		this.isUserVariable = isUserVariable;
		this.updatedAt = LocalDateTime.now();
	}
}