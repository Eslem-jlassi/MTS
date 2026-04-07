package com.billcom.mts.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration OpenAPI / Swagger pour la documentation de l'API MTS.
 * <p>
 * Swagger UI : /swagger-ui.html
 * OpenAPI JSON : /v3/api-docs
 */
@Configuration
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT access token. Obtenu via POST /api/auth/login"
)
public class OpenApiConfig {

    @Bean
    public OpenAPI mtsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MTS Telecom Supervision API")
                        .version("1.0.0")
                        .description("""
                                API REST du systeme de supervision telecom MTS Telecom, realise avec Billcom Consulting.

                                **Authentification :** JWT Bearer Token (access 15 min + refresh 7 jours).
                                Utilisez l'endpoint POST /api/auth/login pour obtenir un token,
                                puis ajoutez-le dans le header Authorization.

                                **Roles :** CLIENT · AGENT · MANAGER · ADMIN
                                """)
                        .contact(new Contact()
                                .name("MTS Telecom / Billcom Consulting")
                                .url("https://mts-telecom.ma")
                                .email("contact@mts-telecom.ma"))
                        .license(new License()
                                .name("Projet interne - PFE 2026")
                                .url("https://mts-telecom.ma")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
