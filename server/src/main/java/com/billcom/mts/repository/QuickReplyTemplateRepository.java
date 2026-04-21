package com.billcom.mts.repository;

import com.billcom.mts.entity.QuickReplyTemplate;
import com.billcom.mts.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour les templates de reponse rapide.
 */
@Repository
public interface QuickReplyTemplateRepository extends JpaRepository<QuickReplyTemplate, Long> {

    /** Templates visibles par un role donne (roleAllowed IS NULL ou = role). */
    @Query("SELECT t FROM QuickReplyTemplate t WHERE t.roleAllowed IS NULL OR t.roleAllowed = :role ORDER BY t.name")
    List<QuickReplyTemplate> findAllAccessibleByRole(@Param("role") String role);

    /** Tous les templates tries par nom. */
    List<QuickReplyTemplate> findAllByOrderByNameAsc();

    /** Recherche par categorie. */
    List<QuickReplyTemplate> findByCategoryOrderByNameAsc(String category);

    @Modifying
    @Query("UPDATE QuickReplyTemplate t SET t.createdBy = :replacementUser WHERE t.createdBy.id = :userId")
    int reassignCreatedBy(@Param("userId") Long userId, @Param("replacementUser") User replacementUser);
}
