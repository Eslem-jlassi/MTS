package com.kerrrusha.taskmanagerbackend.repository;

import com.kerrrusha.taskmanagerbackend.domain.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findAllByColumnId(String columnId);
}
