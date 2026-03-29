package com.billcom.mts.service.ai;

import com.billcom.mts.dto.ai.AiServiceHealthDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.function.Consumer;
import java.util.function.Function;

public abstract class AiGatewaySupport {

    private final Logger log = LoggerFactory.getLogger(getClass());
    private final RestTemplate restTemplate;
    private final LocalAiServiceManager localAiServiceManager;

    protected AiGatewaySupport(RestTemplate restTemplate, LocalAiServiceManager localAiServiceManager) {
        this.restTemplate = restTemplate;
        this.localAiServiceManager = localAiServiceManager;
    }

    protected <T> T post(
            String serviceName,
            String baseUrl,
            String path,
            Object request,
            Class<T> responseType,
            Consumer<T> successHandler,
            Function<String, T> unavailableFactory,
            String emptyBodyMessage,
            String unavailableMessage,
            String temporaryErrorMessage
    ) {
        String endpoint = buildEndpoint(baseUrl, path);
        if (!localAiServiceManager.ensureServiceRunning(serviceName, baseUrl)) {
            return unavailableFactory.apply(unavailableMessage);
        }

        try {
            ResponseEntity<T> response = restTemplate.postForEntity(endpoint, request, responseType);
            T body = response.getBody();
            if (body == null) {
                return unavailableFactory.apply(emptyBodyMessage);
            }

            successHandler.accept(body);
            return body;
        } catch (RestClientResponseException ex) {
            log.warn(
                    "{} upstream error {} from {}: {}",
                    serviceName,
                    ex.getStatusCode(),
                    endpoint,
                    ex.getResponseBodyAsString()
            );
            return unavailableFactory.apply(unavailableMessage);
        } catch (ResourceAccessException ex) {
            log.warn("{} service unreachable at {}: {}", serviceName, endpoint, ex.getMessage());
            return unavailableFactory.apply(unavailableMessage);
        } catch (RestClientException ex) {
            log.warn("Unexpected {} service error from {}: {}", serviceName, endpoint, ex.getMessage());
            return unavailableFactory.apply(temporaryErrorMessage);
        }
    }

    protected AiServiceHealthDto healthCheck(String serviceName, String baseUrl, String path, String unavailableMessage) {
        String endpoint = buildEndpoint(baseUrl, path);
        if (!localAiServiceManager.ensureServiceRunning(serviceName, baseUrl)) {
            return AiServiceHealthDto.unavailable(serviceName, unavailableMessage);
        }

        try {
            ResponseEntity<AiServiceHealthDto> response = restTemplate.getForEntity(endpoint, AiServiceHealthDto.class);
            AiServiceHealthDto body = response.getBody();
            if (body == null) {
                return AiServiceHealthDto.unavailable(serviceName, "Le service a repondu sans payload de sante.");
            }

            body.setAvailable(true);
            if (!StringUtils.hasText(body.getService())) {
                body.setService(serviceName);
            }
            return body;
        } catch (RestClientException ex) {
            log.warn("{} health check failed for {}: {}", serviceName, endpoint, ex.getMessage());
            return AiServiceHealthDto.unavailable(serviceName, unavailableMessage);
        }
    }

    protected String trimTrailingSlash(String value) {
        return value != null && value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String buildEndpoint(String baseUrl, String path) {
        if (path.startsWith("/")) {
            return trimTrailingSlash(baseUrl) + path;
        }
        return trimTrailingSlash(baseUrl) + "/" + path;
    }
}
