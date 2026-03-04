package com.billcom.mts.controller;

import com.billcom.mts.dto.macro.MacroRequest;
import com.billcom.mts.dto.macro.MacroResponse;
import com.billcom.mts.entity.User;
import com.billcom.mts.service.MacroService;
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
 * CRUD des macros (templates / réponses rapides).
 * MANAGER/ADMIN: création, modification, suppression.
 * AGENT+: lecture et utilisation (apply-macro sur ticket).
 */
@RestController
@RequestMapping("/api/macros")
@RequiredArgsConstructor
@Tag(name = "Macros", description = "Templates et réponses rapides pour agents")
public class MacroController {

    private final MacroService macroService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Liste les macros disponibles pour l'utilisateur connecté")
    public ResponseEntity<List<MacroResponse>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(macroService.findAllForCurrentUser(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    @Operation(summary = "Détail d'une macro")
    public ResponseEntity<MacroResponse> getById(@PathVariable Long id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(macroService.findById(id, user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Crée une macro")
    public ResponseEntity<MacroResponse> create(
            @Valid @RequestBody MacroRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(macroService.create(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Modifie une macro")
    public ResponseEntity<MacroResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody MacroRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(macroService.update(id, request, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Supprime une macro")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        macroService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
