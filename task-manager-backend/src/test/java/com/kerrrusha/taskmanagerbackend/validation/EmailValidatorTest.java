package com.kerrrusha.taskmanagerbackend.validation;

import com.kerrrusha.taskmanagerbackend.config.ValidationConfig;
import com.kerrrusha.taskmanagerbackend.domain.User;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.context.annotation.Import;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataMongoTest
@Import(ValidationConfig.class)
class EmailValidatorTest {

    @Autowired
    private LocalValidatorFactoryBean validatorFactory;

    @Test
    void user_validEmail_ok() {
        Validator validator = validatorFactory.getValidator();

        User user = new User();
        user.setEmail("jane@example.com");

        Set<ConstraintViolation<User>> violations = validator.validate(user);
        Set<ConstraintViolation<User>> emailViolations = violations.stream()
                .filter(violation -> violation.getMessage().equals("must be a valid email address"))
                .collect(Collectors.toSet());

        assertEquals(0, emailViolations.size());
    }

    @Test
    void user_invalidEmail_notOk() {
        Validator validator = validatorFactory.getValidator();

        User user = new User();
        user.setEmail("invalid-email");

        Set<ConstraintViolation<User>> violations = validator.validate(user);
        Set<ConstraintViolation<User>> emailViolations = violations.stream()
                .filter(violation -> violation.getMessage().equals("must be a valid email address"))
                .collect(Collectors.toSet());

        assertEquals(1, emailViolations.size());
    }
}
