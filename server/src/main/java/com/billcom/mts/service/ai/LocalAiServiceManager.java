package com.billcom.mts.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LocalAiServiceManager {

    private static final Logger log = LoggerFactory.getLogger(LocalAiServiceManager.class);

    private final RestTemplate restTemplate;
    private final boolean autostartEnabled;
    private final long startupTimeoutMs;
    private final long pollIntervalMs;
    private final Path projectRoot;
    private final Path aiLogsDir;
    private final Map<String, Process> managedProcesses = new ConcurrentHashMap<>();

    public LocalAiServiceManager(
            RestTemplate restTemplate,
            @Value("${ai.autostart.enabled:true}") boolean autostartEnabled,
            @Value("${ai.autostart.wait-timeout-ms:30000}") long startupTimeoutMs,
            @Value("${ai.autostart.poll-interval-ms:1000}") long pollIntervalMs
    ) {
        this.restTemplate = restTemplate;
        this.autostartEnabled = autostartEnabled;
        this.startupTimeoutMs = startupTimeoutMs;
        this.pollIntervalMs = pollIntervalMs;
        this.projectRoot = resolveProjectRoot();
        this.aiLogsDir = this.projectRoot.resolve("logs").resolve("ai");
    }

    public boolean ensureServiceRunning(String serviceName, String baseUrl) {
        if (isReachable(baseUrl)) {
            return true;
        }

        if (!autostartEnabled || !isLocalBaseUrl(baseUrl)) {
            return false;
        }

        Optional<ServiceLaunchConfig> configOptional = resolveConfig(serviceName, baseUrl);
        if (configOptional.isEmpty()) {
            log.debug("No local launch configuration found for {} at {}", serviceName, baseUrl);
            return false;
        }

        ServiceLaunchConfig config = configOptional.get();
        Process existing = managedProcesses.get(serviceName);
        if (existing != null && existing.isAlive()) {
            return waitUntilReachable(serviceName, baseUrl, existing);
        }

        synchronized (serviceName.intern()) {
            if (isReachable(baseUrl)) {
                return true;
            }

            Process process = managedProcesses.get(serviceName);
            if (process != null && process.isAlive()) {
                return waitUntilReachable(serviceName, baseUrl, process);
            }

            return startAndWait(serviceName, baseUrl, config);
        }
    }

    private boolean startAndWait(String serviceName, String baseUrl, ServiceLaunchConfig config) {
        try {
            Files.createDirectories(aiLogsDir);
            ProcessBuilder builder = new ProcessBuilder(config.command());
            builder.directory(config.workingDirectory().toFile());
            builder.redirectOutput(aiLogsDir.resolve(serviceName + ".out.log").toFile());
            builder.redirectError(aiLogsDir.resolve(serviceName + ".err.log").toFile());

            log.info("Starting local AI service {} from {}", serviceName, config.workingDirectory());
            Process process = builder.start();
            managedProcesses.put(serviceName, process);
            return waitUntilReachable(serviceName, baseUrl, process);
        } catch (Exception ex) {
            log.warn("Failed to start local AI service {}: {}", serviceName, ex.getMessage());
            return false;
        }
    }

    private boolean waitUntilReachable(String serviceName, String baseUrl, Process process) {
        long deadline = System.currentTimeMillis() + startupTimeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (isReachable(baseUrl)) {
                log.info("Local AI service {} is reachable on {}", serviceName, baseUrl);
                return true;
            }

            if (process != null && !process.isAlive()) {
                managedProcesses.remove(serviceName, process);
                log.warn("Local AI service {} stopped before becoming healthy", serviceName);
                return false;
            }

            try {
                Thread.sleep(pollIntervalMs);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        log.warn("Timed out waiting for local AI service {} on {}", serviceName, baseUrl);
        return isReachable(baseUrl);
    }

    private boolean isReachable(String baseUrl) {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(trimTrailingSlash(baseUrl) + "/health", String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (RestClientException ex) {
            return false;
        }
    }

    private Optional<ServiceLaunchConfig> resolveConfig(String serviceName, String baseUrl) {
        URI uri = URI.create(baseUrl);
        String host = uri.getHost();
        int port = uri.getPort();

        if ("sentiment-service".equals(serviceName)) {
            Path workingDir = projectRoot.resolve("sentiment-service");
            return buildConfig(serviceName, workingDir, host, port, "app.main:app");
        }

        if ("duplicate-service".equals(serviceName)) {
            Path workingDir = projectRoot.resolve("duplicate-service");
            return buildConfig(serviceName, workingDir, host, port, "app.main:app");
        }

        if ("ai-chatbot".equals(serviceName)) {
            Path workingDir = projectRoot.resolve("ai-chatbot");
            return buildConfig(serviceName, workingDir, host, port, "app:app");
        }

        return Optional.empty();
    }

    private Optional<ServiceLaunchConfig> buildConfig(
            String serviceName,
            Path workingDir,
            String host,
            int port,
            String appTarget
    ) {
        if (!Files.isDirectory(workingDir)) {
            log.warn("AI service {} working directory not found: {}", serviceName, workingDir);
            return Optional.empty();
        }

        String pythonExecutable = resolvePythonExecutable(workingDir)
                .orElseGet(() -> isWindows() ? "python" : "python3");

        return Optional.of(new ServiceLaunchConfig(
                workingDir,
                List.of(
                        pythonExecutable,
                        "-m",
                        "uvicorn",
                        appTarget,
                        "--host",
                        host != null && !host.isBlank() ? host : "127.0.0.1",
                        "--port",
                        String.valueOf(port)
                )
        ));
    }

    private Optional<String> resolvePythonExecutable(Path serviceDir) {
        List<Path> candidates = List.of(
                projectRoot.resolve(".venv").resolve(isWindows() ? Paths.get("Scripts", "python.exe") : Paths.get("bin", "python")),
                serviceDir.resolve("venv").resolve(isWindows() ? Paths.get("Scripts", "python.exe") : Paths.get("bin", "python"))
        );

        return candidates.stream()
                .filter(Files::exists)
                .map(Path::toAbsolutePath)
                .map(Path::toString)
                .findFirst();
    }

    private boolean isLocalBaseUrl(String baseUrl) {
        try {
            URI uri = URI.create(baseUrl);
            String host = uri.getHost();
            return "127.0.0.1".equals(host) || "localhost".equalsIgnoreCase(host);
        } catch (Exception ex) {
            return false;
        }
    }

    private Path resolveProjectRoot() {
        Path current = Paths.get("").toAbsolutePath().normalize();
        if (current.getFileName() != null && "server".equalsIgnoreCase(current.getFileName().toString())) {
            return current.getParent() != null ? current.getParent() : current;
        }
        return current;
    }

    private boolean isWindows() {
        return File.separatorChar == '\\';
    }

    private String trimTrailingSlash(String value) {
        return value != null && value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record ServiceLaunchConfig(Path workingDirectory, List<String> command) {
    }
}
