package com.ksp.intelligence;

import com.ksp.intelligence.model.CaseMaster;
import com.ksp.intelligence.model.CaseMasterKey;
import com.ksp.intelligence.repository.CaseMasterRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
public class CaseMasterRepositoryTest {

    @Autowired
    private CaseMasterRepository repository;

    @Test
    void testSaveAndFindByCrimeNo() {
        CaseMasterKey key = new CaseMasterKey(1, LocalDate.of(2024, 1, 1));
        CaseMaster cm = new CaseMaster();
        cm.setId(key);
        cm.setCrimeNo("123450001202400001");
        repository.save(cm);
        assertTrue(repository.findByCrimeNo("123450001202400001").isPresent());
    }
}