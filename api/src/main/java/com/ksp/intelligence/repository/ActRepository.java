package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Act;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for the {@link Act} lookup table (IPC / IT_ACT / SCST / ARMS). */
@Repository
public interface ActRepository extends JpaRepository<Act, String> {
}
