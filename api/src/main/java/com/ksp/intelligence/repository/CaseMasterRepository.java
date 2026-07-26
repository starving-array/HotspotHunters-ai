package com.ksp.intelligence.repository;

import com.ksp.intelligence.model.CaseMaster;
import com.ksp.intelligence.model.CaseMasterKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface CaseMasterRepository extends JpaRepository<CaseMaster, CaseMasterKey> {

    @Query(value = "SELECT * FROM casemaster WHERE crimeno = ?1 LIMIT 1", nativeQuery = true)
    Optional<CaseMaster> findByCrimeNo(String crimeNo);

    @Query(value = "SELECT COUNT(*) FROM casemaster WHERE is_cybercrime = true", nativeQuery = true)
    long countByIsCybercrimeTrue();

    @Query(value = "SELECT * FROM casemaster WHERE is_cybercrime = true AND latitude IS NOT NULL AND longitude IS NOT NULL", nativeQuery = true)
    List<CaseMaster> findByIsCybercrimeTrueAndLatitudeIsNotNullAndLongitudeIsNotNull();

    @Query(value = "SELECT COUNT(*) FROM casemaster WHERE is_cybercrime = true AND financial_loss > 0", nativeQuery = true)
    long countFinancialFraud();

    @Query(value = "SELECT COUNT(DISTINCT c.casemasterid) FROM casemaster c " +
           "JOIN cyber_indicators i ON i.casemasterid = c.casemasterid " +
           "WHERE c.is_cybercrime = true AND i.indicator_type IN ('social_handle', 'email', 'phone', 'bank_account')",
           nativeQuery = true)
    long countIdentityTheft();

    @Query(value = "SELECT c.casemasterid, c.crimeno, c.latitude, c.longitude, " +
           "COALESCE(c.cyber_severity, 'medium') AS severity, " +
           "d.districtname AS district, c.crimeregistereddate " +
           "FROM casemaster c " +
           "LEFT JOIN unit u ON u.unitid = c.policestationid " +
           "LEFT JOIN district d ON d.districtid = u.districtid " +
           "WHERE c.is_cybercrime = true AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL",
           nativeQuery = true)
    List<Object[]> findCybercrimeMapAlerts();
}
