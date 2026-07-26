package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.ActSectionAssociation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link ActSectionAssociation} junction table. */
@Repository
public interface ActSectionAssociationRepository
        extends JpaRepository<ActSectionAssociation, ActSectionAssociation.Key> {
    List<ActSectionAssociation> findByCaseMasterID(Integer caseMasterID);
}
