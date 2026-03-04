package com.billcom.mts.service;

import com.billcom.mts.dto.sla.SlaPolicyRequest;
import com.billcom.mts.dto.sla.SlaPolicyResponse;
import com.billcom.mts.entity.User;

import java.util.List;

/**
 * Service de gestion des politiques SLA (Service Level Agreement).
 * <p>
 * Opérations :
 * - Lister toutes les politiques (filtre par statut actif)
 * - Compter les politiques actives (KPI dashboard)
 * - CRUD complet (création, lecture, mise à jour, suppression)
 * - Audit automatique sur chaque opération d'écriture
 */
public interface SlaPolicyService {

    /**
     * Liste toutes les politiques SLA.
     *
     * @param activeOnly si true, ne retourne que les politiques actives
     * @return liste ordonnée par priorité
     */
    List<SlaPolicyResponse> listAll(boolean activeOnly);

    /**
     * Récupère une politique par ID.
     *
     * @param id identifiant
     * @return la politique trouvée
     * @throws com.billcom.mts.exception.ResourceNotFoundException si introuvable
     */
    SlaPolicyResponse getById(Long id);

    /**
     * Compte les politiques SLA actives (pour KPI dashboard Admin).
     *
     * @return nombre de politiques actives
     */
    long countActive();

    /**
     * Crée une nouvelle politique SLA.
     *
     * @param request  données de la politique
     * @param actor    utilisateur effectuant l'action (pour audit)
     * @param ipAddress adresse IP de la requête (pour audit)
     * @return la politique créée
     */
    SlaPolicyResponse create(SlaPolicyRequest request, User actor, String ipAddress);

    /**
     * Met à jour une politique SLA existante.
     *
     * @param id       identifiant de la politique à modifier
     * @param request  nouvelles données
     * @param actor    utilisateur effectuant l'action
     * @param ipAddress adresse IP de la requête
     * @return la politique mise à jour
     */
    SlaPolicyResponse update(Long id, SlaPolicyRequest request, User actor, String ipAddress);

    /**
     * Supprime une politique SLA.
     *
     * @param id       identifiant de la politique
     * @param actor    utilisateur effectuant l'action
     * @param ipAddress adresse IP de la requête
     */
    void delete(Long id, User actor, String ipAddress);
}
