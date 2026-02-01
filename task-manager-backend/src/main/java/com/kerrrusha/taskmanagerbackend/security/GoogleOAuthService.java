package com.kerrrusha.taskmanagerbackend.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.kerrrusha.taskmanagerbackend.domain.Role;
import com.kerrrusha.taskmanagerbackend.domain.User;
import com.kerrrusha.taskmanagerbackend.dto.oauth.GoogleOAuthLoginRequestDto;
import com.kerrrusha.taskmanagerbackend.repository.UserRepository;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Slf4j
@Service
public class GoogleOAuthService {

    private static final int PASSWORD_LENGTH = 20;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final GoogleIdTokenVerifier verifier;
    private final RandomPasswordGenerator randomPasswordGenerator;

    public GoogleOAuthService(
            @Value("${google.oauth.client-id}") String clientId,
            UserRepository userRepository,
            JwtService jwtService,
            RandomPasswordGenerator randomPasswordGenerator) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.randomPasswordGenerator = randomPasswordGenerator;

        NetHttpTransport transport = new NetHttpTransport();
        JsonFactory jsonFactory = new JacksonFactory();
        verifier = new GoogleIdTokenVerifier.Builder(transport, jsonFactory)
                .setAudience(Collections.singletonList(clientId))
                .build();
    }

    public String authenticate(GoogleOAuthLoginRequestDto requestBody) {
        User user = verifyIDToken(requestBody.getIdToken());
        user = createOrGetUser(user);
        return jwtService.generateToken(user, false);
    }

    @Transactional
    protected User createOrGetUser(User user) {
        User existingUser = userRepository.findByEmail(user.getEmail()).orElse(null);
        if (existingUser != null) {
            return existingUser;
        }
        user.setRoles(Collections.singleton(Role.USER));
        userRepository.save(user);
        return user;
    }

    @SneakyThrows
    private User verifyIDToken(String idToken) {
        GoogleIdToken idTokenObj = verifier.verify(idToken);
        GoogleIdToken.Payload payload = idTokenObj.getPayload();

        String firstName = (String) payload.get("given_name");
        String lastName = (String) payload.get("family_name");
        String email = payload.getEmail();
        String profilePhotoUrl = (String) payload.get("picture");
        String tempPassword = randomPasswordGenerator.generatePassword(PASSWORD_LENGTH);

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setProfilePhotoUrl(profilePhotoUrl);
        user.setEmail(email);
        user.setPassword(tempPassword);

        return user;
    }
}
