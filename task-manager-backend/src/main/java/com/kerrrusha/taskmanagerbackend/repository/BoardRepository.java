package com.kerrrusha.taskmanagerbackend.repository;

import com.kerrrusha.taskmanagerbackend.domain.Board;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface BoardRepository extends MongoRepository<Board, String> {
    List<Board> findAllByCreatedByUserId(String userId);

    Optional<Board> findByIdAndCreatedByUserId(String id, String userId);
}
