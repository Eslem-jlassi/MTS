package com.billcom.mts.service.impl;

import com.billcom.mts.dto.quickreply.QuickReplyTemplateRequest;
import com.billcom.mts.dto.quickreply.QuickReplyTemplateResponse;
import com.billcom.mts.entity.QuickReplyTemplate;
import com.billcom.mts.entity.User;
import com.billcom.mts.repository.QuickReplyTemplateRepository;
import com.billcom.mts.service.QuickReplyTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service Quick Reply Templates.
 */
@Service
@RequiredArgsConstructor
public class QuickReplyTemplateServiceImpl implements QuickReplyTemplateService {

    private final QuickReplyTemplateRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<QuickReplyTemplateResponse> findAllForUser(User user) {
        String role = user.getRole().name();
        // ADMIN voit tout
        if ("ADMIN".equals(role)) {
            return repository.findAllByOrderByNameAsc().stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
        }
        return repository.findAllAccessibleByRole(role).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public QuickReplyTemplateResponse findById(Long id) {
        QuickReplyTemplate template = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quick reply template not found: " + id));
        return toResponse(template);
    }

    @Override
    @Transactional
    public QuickReplyTemplateResponse create(QuickReplyTemplateRequest request, User createdBy) {
        QuickReplyTemplate template = QuickReplyTemplate.builder()
                .name(request.getName())
                .content(request.getContent())
                .category(request.getCategory() != null ? request.getCategory() : "custom")
                .variables(request.getVariables())
                .roleAllowed(request.getRoleAllowed())
                .createdBy(createdBy)
                .build();
        return toResponse(repository.save(template));
    }

    @Override
    @Transactional
    public QuickReplyTemplateResponse update(Long id, QuickReplyTemplateRequest request) {
        QuickReplyTemplate template = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quick reply template not found: " + id));
        template.setName(request.getName());
        template.setContent(request.getContent());
        if (request.getCategory() != null) template.setCategory(request.getCategory());
        template.setVariables(request.getVariables());
        template.setRoleAllowed(request.getRoleAllowed());
        return toResponse(repository.save(template));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Quick reply template not found: " + id);
        }
        repository.deleteById(id);
    }

    // --- Mapper ---

    private QuickReplyTemplateResponse toResponse(QuickReplyTemplate entity) {
        List<String> vars = entity.getVariables() != null && !entity.getVariables().isBlank()
                ? Arrays.asList(entity.getVariables().split(","))
                : Collections.emptyList();

        return QuickReplyTemplateResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .content(entity.getContent())
                .category(entity.getCategory())
                .variables(vars)
                .roleAllowed(entity.getRoleAllowed())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
