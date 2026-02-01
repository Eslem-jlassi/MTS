package com.kerrrusha.taskmanagerbackend.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Getter
@Setter
@Document
@NoArgsConstructor
@AllArgsConstructor
public class Task extends BaseEntity {
    @NotBlank
    private String columnId;

    @NotBlank
    private String title;

    private String description;

    private String assignedTo;

    @NotBlank
    private Priority priority;

    @NotNull
    private LocalDate dueDate;

    public enum Priority {
        LOW,
        NORMAL,
        HIGH,
        URGENT
    }
}
