package com.billcom.mts.controller;

import com.billcom.mts.dto.quickreply.QuickReplyTemplateRequest;
import com.billcom.mts.dto.quickreply.QuickReplyTemplateResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.service.QuickReplyTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CRUD des templates de réponse rapide (Quick Replies).
 * AGENT+: lecture. MANAGER/ADMIN: création, modification, suppression.
 */
@RestController
@RequestMapping("/api/quick-replies")
@RequiredArgsConstructor
@Tag(name = "Quick Replies", description = "Templates de réponse rapide")
public class QuickReplyTemplateController {

    private final QuickReplyTemplateService quickReplyTemplateService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Liste les templates accessibles par l'utilisateur connecté")
    public ResponseEntity<List<QuickReplyTemplateResponse>> list(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(quickReplyTemplateService.findAllForUser(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Détail d'un template")
    public ResponseEntity<QuickReplyTemplateResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(quickReplyTemplateService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Crée un template de réponse rapide")
    public ResponseEntity<QuickReplyTemplateResponse> create(
            @Valid @RequestBody QuickReplyTemplateRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(quickReplyTemplateService.create(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Met à jour un template")
    public ResponseEntity<QuickReplyTemplateResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody QuickReplyTemplateRequest request) {
        return ResponseEntity.ok(quickReplyTemplateService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Supprime un template")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        quickReplyTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
