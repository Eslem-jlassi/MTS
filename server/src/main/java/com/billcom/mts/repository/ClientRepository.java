package com.billcom.mts.repository;

import com.billcom.mts.entity.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for Client entity operations.
 */
@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {

    Optional<Client> findByUserId(Long userId);

    Optional<Client> findByClientCode(String clientCode);

    boolean existsByClientCode(String clientCode);

    Optional<Client> findByUserEmail(String email);

    @Query("SELECT c FROM Client c JOIN FETCH c.user WHERE " +
           "(LOWER(c.companyName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.clientCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.user.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(c.user.lastName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Client> searchClients(@Param("search") String search, Pageable pageable);

    @Query("SELECT c FROM Client c JOIN FETCH c.user")
    Page<Client> findAllWithUser(Pageable pageable);

    @Query("SELECT c FROM Client c JOIN FETCH c.user WHERE c.id = :id")
    Optional<Client> findByIdWithUser(@Param("id") Long id);

    @Query("SELECT c FROM Client c JOIN FETCH c.user WHERE c.clientCode = :code")
    Optional<Client> findByClientCodeWithUser(@Param("code") String code);

    @Query("SELECT MAX(CAST(SUBSTRING(c.clientCode, 10) AS integer)) FROM Client c WHERE c.clientCode LIKE :prefix%")
    Integer findMaxClientCodeNumber(@Param("prefix") String prefix);
}
