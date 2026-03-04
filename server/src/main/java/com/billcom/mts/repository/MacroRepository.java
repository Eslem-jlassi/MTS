package com.billcom.mts.repository;

import com.billcom.mts.entity.Macro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MacroRepository extends JpaRepository<Macro, Long> {

    /** Liste des macros visibles pour un rôle (roleAllowed = role ou null). */
    List<Macro> findByRoleAllowedNullOrRoleAllowedOrderByNameAsc(String roleAllowed);
}
