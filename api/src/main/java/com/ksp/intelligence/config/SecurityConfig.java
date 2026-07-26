package com.ksp.intelligence.config;

import com.ksp.intelligence.security.JwtAuthenticationFilter;
import com.ksp.intelligence.interceptor.RateLimitingInterceptor;
import com.ksp.intelligence.interceptor.AuditInterceptor;
import com.ksp.intelligence.security.JwtTokenProvider;
import com.ksp.intelligence.security.SecurityHeadersFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class SecurityConfig implements WebMvcConfigurer {

    private final JwtTokenProvider tokenProvider;
    private final RateLimitingInterceptor rateLimitingInterceptor;
    private final AuditInterceptor auditInterceptor;
    private final String frontendUrl;

    public SecurityConfig(JwtTokenProvider tokenProvider,
                          RateLimitingInterceptor rateLimitingInterceptor,
                          AuditInterceptor auditInterceptor,
                          @Value("${FRONTEND_URL:http://localhost:5173}") String frontendUrl) {
        this.tokenProvider = tokenProvider;
        this.rateLimitingInterceptor = rateLimitingInterceptor;
        this.auditInterceptor = auditInterceptor;
        this.frontendUrl = frontendUrl;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/api/v1/alerts/stream", "/actuator/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(new JwtAuthenticationFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new SecurityHeadersFilter(), JwtAuthenticationFilter.class);
        return http.build();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitingInterceptor).addPathPatterns("/api/v1/**");
        registry.addInterceptor(auditInterceptor).addPathPatterns("/api/v1/**");
    }
}
