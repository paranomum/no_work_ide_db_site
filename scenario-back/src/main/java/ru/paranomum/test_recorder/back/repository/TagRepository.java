package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.Tag;

import java.util.List;

public interface TagRepository extends JpaRepository<Tag, Long> {

	boolean existsByNameIgnoreCase(String name);

	List<Tag> findAllByOrderByNameAsc();

	List<Tag> findAllByNameContainingIgnoreCaseOrderByNameAsc(String query);
}