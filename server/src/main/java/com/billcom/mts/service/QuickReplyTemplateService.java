package com.billcom.mts.service;

import com.billcom.mts.dto.quickreply.QuickReplyTemplateRequest;
import com.billcom.mts.dto.quickreply.QuickReplyTemplateResponse;
import com.billcom.mts.entity.User;

import java.util.List;

/**
 * Service pour les templates de réponse rapide (Quick Replies).
 */
public interface QuickReplyTemplateService {

    /** Liste les templates accessibles par l'utilisateur (filtrés par rôle). */
    List<QuickReplyTemplateResponse> findAllForUser(User user);

    /** Récupère un template par ID. */
    QuickReplyTemplateResponse findById(Long id);

    /** Crée un nouveau template. */
    QuickReplyTemplateResponse create(QuickReplyTemplateRequest request, User createdBy);

    /** Met à jour un template. */
    QuickReplyTemplateResponse update(Long id, QuickReplyTemplateRequest request);

    /** Supprime un template. */
    void delete(Long id);
}
