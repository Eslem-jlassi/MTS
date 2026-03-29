package com.billcom.mts.service.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Component
public class LocalAiWarmupRunner {

    private final LocalAiServiceManager localAiServiceManager;
    private final boolean autostartEnabled;
    private final String sentimentBaseUrl;
    private final String duplicateBaseUrl;

    public LocalAiWarmupRunner(
            LocalAiServiceManager localAiServiceManager,
            @Value("${ai.autostart.enabled:true}") boolean autostartEnabled,
            @Value("${ai.sentiment.base-url}") String sentimentBaseUrl,
            @Value("${ai.duplicate.base-url}") String duplicateBaseUrl
    ) {
        this.localAiServiceManager = localAiServiceManager;
        this.autostartEnabled = autostartEnabled;
        this.sentimentBaseUrl = sentimentBaseUrl;
        this.duplicateBaseUrl = duplicateBaseUrl;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void prewarmLocalServices() {
        if (!autostartEnabled) {
            log.info("Local AI warm-up is disabled.");
            return;
        }

        warmInBackground("sentiment-service", sentimentBaseUrl);
        warmInBackground("duplicate-service", duplicateBaseUrl);
    }

    private void warmInBackground(String serviceName, String baseUrl) {
        CompletableFuture.runAsync(() -> {
            log.info("Pre-warming {} on {}", serviceName, baseUrl);
            boolean ready = localAiServiceManager.ensureServiceRunning(serviceName, baseUrl);
            if (ready) {
                log.info("{} is ready.", serviceName);
            } else {
                log.warn("{} could not be pre-warmed on {}", serviceName, baseUrl);
            }
        });
    }
}
