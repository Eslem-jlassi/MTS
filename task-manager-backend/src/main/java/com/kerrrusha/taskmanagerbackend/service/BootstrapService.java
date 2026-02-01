package com.kerrrusha.taskmanagerbackend.service;

import com.kerrrusha.taskmanagerbackend.domain.Role;
import com.kerrrusha.taskmanagerbackend.domain.User;
import com.kerrrusha.taskmanagerbackend.repository.UserRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import static java.util.Collections.singleton;

@Slf4j
@Component
@RequiredArgsConstructor
public class BootstrapService implements ApplicationListener<ContextRefreshedEvent> {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void onApplicationEvent(@NonNull ContextRefreshedEvent event) {
        saveAdminIfNotExists();
    }

    private void saveAdminIfNotExists() {
        User admin = new User();
        admin.setEmail("admin@admin.com");
        admin.setFirstName("First");
        admin.setLastName("Last");
        admin.setPassword(passwordEncoder.encode("qwerty"));
        admin.setRoles(singleton(Role.ADMIN));

        if (userRepository.findByEmail(admin.getEmail()).isPresent()) {
            return;
        }

        log.info("Saving admin: {}", admin);
        userRepository.save(admin);
    }
}
