package com.kerrrusha.taskmanagerbackend.repository;

import com.kerrrusha.taskmanagerbackend.domain.Column;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ColumnRepository extends MongoRepository<Column, String> {
    List<Column> findAllByBoardId(String boardId);

    Optional<Column> findByIdAndCreatedByUserId(String id, String userId);
}
