package com.kerrrusha.taskmanagerbackend.mapper;

import com.kerrrusha.taskmanagerbackend.config.MapperConfig;
import com.kerrrusha.taskmanagerbackend.domain.User;
import com.kerrrusha.taskmanagerbackend.dto.user.response.UserResponseDto;
import org.mapstruct.Mapper;

@Mapper(config = MapperConfig.class)
public interface UserMapper {
    UserResponseDto toDto(User user);
}
