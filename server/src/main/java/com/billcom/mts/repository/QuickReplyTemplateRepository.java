package com.billcom.mts.repository;

import com.billcom.mts.entity.QuickReplyTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour les templates de réponse rapide.
 */
@Repository
public interface QuickReplyTemplateRepository extends JpaRepository<QuickReplyTemplate, Long> {

    /** Templates visibles par un rôle donné (roleAllowed IS NULL ou = role) */
    @Query("SELECT t FROM QuickReplyTemplate t WHERE t.roleAllowed IS NULL OR t.roleAllowed = :role ORDER BY t.name")
    List<QuickReplyTemplate> findAllAccessibleByRole(@Param("role") String role);

    /** Tous les templates triés par nom */
    List<QuickReplyTemplate> findAllByOrderByNameAsc();

    /** Recherche par catégorie */
    List<QuickReplyTemplate> findByCategoryOrderByNameAsc(String category);
}
