package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.paranomum.test_recorder.back.entity.Scenario;

import java.util.List;

public interface ScenarioRepository extends JpaRepository<Scenario, Long> {

	boolean existsByNameIgnoreCase(String name);

	List<Scenario> findAllByOrderByNameAsc();

	List<Scenario> findAllByNameContainingIgnoreCaseOrderByNameAsc(
			String query
	);

	@Query("""
        SELECT s
        FROM Scenario s
        JOIN ScenarioTag st ON st.scenarioId = s.id
        WHERE st.tagId IN :tagIds
        GROUP BY s.id
        HAVING COUNT(DISTINCT st.tagId) = :tagCount
        ORDER BY s.name ASC
        """)
	List<Scenario> findAllByTagIdsAnd(
			@Param("tagIds") List<Long> tagIds,
			@Param("tagCount") long tagCount
	);
}