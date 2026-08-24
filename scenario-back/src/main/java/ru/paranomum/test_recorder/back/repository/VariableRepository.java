package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.Variable;

import java.util.List;

public interface VariableRepository extends JpaRepository<Variable, Long> {

	boolean existsByNameIgnoreCase(String name);

	List<Variable> findAllByOrderByNameAsc();

	List<Variable> findAllByNameContainingIgnoreCaseOrderByNameAsc(
			String query
	);

	List<Variable> findAllByIsUserVariableTrueOrderByNameAsc();
}