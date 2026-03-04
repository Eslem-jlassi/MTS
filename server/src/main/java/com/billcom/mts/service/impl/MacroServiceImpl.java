package com.billcom.mts.service.impl;

import com.billcom.mts.dto.macro.MacroRequest;
import com.billcom.mts.dto.macro.MacroResponse;
import com.billcom.mts.entity.Macro;
import com.billcom.mts.entity.User;
import com.billcom.mts.enums.UserRole;
import com.billcom.mts.exception.ForbiddenException;
import com.billcom.mts.exception.ResourceNotFoundException;
import com.billcom.mts.repository.MacroRepository;
import com.billcom.mts.service.MacroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MacroServiceImpl implements MacroService {

    private final MacroRepository macroRepository;

    @Override
    public List<MacroResponse> findAllForCurrentUser(User currentUser) {
        ensureStaff(currentUser);
        String role = currentUser.getRole().name();
        return macroRepository.findByRoleAllowedNullOrRoleAllowedOrderByNameAsc(role).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public MacroResponse findById(Long id, User currentUser) {
        ensureStaff(currentUser);
        Macro macro = macroRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Macro", "id", id));
        ensureCanUse(macro, currentUser);
        return toResponse(macro);
    }

    @Override
    @Transactional
    public MacroResponse create(MacroRequest request, User currentUser) {
        ensureManagerOrAdmin(currentUser);
        Macro macro = Macro.builder()
            .name(request.getName())
            .content(request.getContent())
            .roleAllowed(request.getRoleAllowed())
            .build();
        macro = macroRepository.save(macro);
        return toResponse(macro);
    }

    @Override
    @Transactional
    public MacroResponse update(Long id, MacroRequest request, User currentUser) {
        ensureManagerOrAdmin(currentUser);
        Macro macro = macroRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Macro", "id", id));
        macro.setName(request.getName());
        macro.setContent(request.getContent());
        macro.setRoleAllowed(request.getRoleAllowed());
        macro = macroRepository.save(macro);
        return toResponse(macro);
    }

    @Override
    @Transactional
    public void delete(Long id, User currentUser) {
        ensureManagerOrAdmin(currentUser);
        if (!macroRepository.existsById(id)) {
            throw new ResourceNotFoundException("Macro", "id", id);
        }
        macroRepository.deleteById(id);
    }

    private void ensureStaff(User user) {
        if (user.getRole() == UserRole.CLIENT) {
            throw new ForbiddenException("Réservé aux agents et managers");
        }
    }

    private void ensureManagerOrAdmin(User user) {
        if (user.getRole() != UserRole.MANAGER && user.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Seuls MANAGER et ADMIN peuvent gérer les macros");
        }
    }

    private void ensureCanUse(Macro macro, User user) {
        if (macro.getRoleAllowed() != null && !macro.getRoleAllowed().equals(user.getRole().name())) {
            throw new ForbiddenException("Cette macro n'est pas disponible pour votre rôle");
        }
    }

    private MacroResponse toResponse(Macro m) {
        return MacroResponse.builder()
            .id(m.getId())
            .name(m.getName())
            .content(m.getContent())
            .roleAllowed(m.getRoleAllowed())
            .createdAt(m.getCreatedAt())
            .updatedAt(m.getUpdatedAt())
            .build();
    }
}
