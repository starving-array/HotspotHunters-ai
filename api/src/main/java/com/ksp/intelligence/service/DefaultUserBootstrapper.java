package com.ksp.intelligence.service;

import com.ksp.intelligence.model.domain.KspUser;
import com.ksp.intelligence.repository.KspUserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DefaultUserBootstrapper {

    private static final Logger log = LoggerFactory.getLogger(DefaultUserBootstrapper.class);

    private final KspUserRepository userRepo;
    private final BCryptPasswordEncoder encoder;

    public DefaultUserBootstrapper(KspUserRepository userRepo, BCryptPasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.encoder = encoder;
    }

    @PostConstruct
    public void init() {
        if (userRepo.findByUsernameAndActiveTrue("admin").isEmpty()) {
            KspUser admin = new KspUser();
            admin.setUsername("admin");
            admin.setHashedPassword(encoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setDisplayName("System Administrator");
            userRepo.save(admin);
            log.info("Created default admin user (admin / admin123)");
        }
        if (userRepo.findByUsernameAndActiveTrue("analyst").isEmpty()) {
            KspUser analyst = new KspUser();
            analyst.setUsername("analyst");
            analyst.setHashedPassword(encoder.encode("analyst123"));
            analyst.setRole("ANALYST");
            analyst.setDisplayName("Crime Analyst");
            userRepo.save(analyst);
            log.info("Created default analyst user (analyst / analyst123)");
        }
    }
}
