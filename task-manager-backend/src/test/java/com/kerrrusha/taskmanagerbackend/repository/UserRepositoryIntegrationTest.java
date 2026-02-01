package com.kerrrusha.taskmanagerbackend.repository;

import com.kerrrusha.taskmanagerbackend.domain.User;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataMongoTest
@Testcontainers
@ExtendWith(SpringExtension.class)
public class UserRepositoryIntegrationTest {

    @Container
    private static final MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:latest");

    @Autowired
    private UserRepository userRepository;

    @BeforeAll
    static void setUp() {
        mongoDBContainer.start();
    }

    @Test
    void testSaveUser() {
        // Given
        User user = new User();

        user.setFirstName("asd");
        user.setLastName("asd");
        user.setEmail("test@test.com");
        user.setPassword("test");

        // When
        userRepository.save(user);

        // Then
        User savedUser = userRepository.findById(user.getId()).orElse(null);

        assertNotNull(savedUser);
        assertEquals(user.getFirstName(), savedUser.getFirstName());
        assertEquals(user.getLastName(), savedUser.getLastName());
    }

    @AfterAll
    static void tearDown() {
        mongoDBContainer.stop();
    }
}
