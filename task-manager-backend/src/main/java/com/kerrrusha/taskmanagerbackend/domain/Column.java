package com.kerrrusha.taskmanagerbackend.domain;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document
@NoArgsConstructor
@AllArgsConstructor
public class Column extends BaseEntity {
    @NotBlank
    private String boardId;

    @NotBlank
    private String title;

    private String background;
}
