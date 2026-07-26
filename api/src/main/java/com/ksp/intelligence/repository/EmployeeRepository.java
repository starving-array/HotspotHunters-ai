package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/** Repository for the {@link Employee} (police personnel) table. */
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
    Optional<Employee> findByKgid(String kgid);
    List<Employee> findByUnit_UnitID(Integer unitID);
}
