package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Repository for the {@link Section} lookup table (composite PK). */
@Repository
public interface SectionRepository extends JpaRepository<Section, Section.Key> {
    List<Section> findByActCode(String actCode);
}
