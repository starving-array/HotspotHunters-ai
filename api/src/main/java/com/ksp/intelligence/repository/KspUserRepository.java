package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.domain.KspUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KspUserRepository extends JpaRepository<KspUser, Integer> {
    Optional<KspUser> findByUsernameAndActiveTrue(String username);
}
