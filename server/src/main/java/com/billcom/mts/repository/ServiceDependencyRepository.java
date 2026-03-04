package com.billcom.mts.repository;

import com.billcom.mts.entity.ServiceDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceDependencyRepository extends JpaRepository<ServiceDependency, Long> {

    List<ServiceDependency> findByParentId(Long parentId);

    List<ServiceDependency> findByChildId(Long childId);

    @Query("SELECT sd FROM ServiceDependency sd JOIN FETCH sd.parent JOIN FETCH sd.child")
    List<ServiceDependency> findAllWithServices();
}
