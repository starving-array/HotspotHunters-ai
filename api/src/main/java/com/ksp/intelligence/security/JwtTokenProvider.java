package com.ksp.intelligence.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final long accessValidityInMs;
    private final long refreshValidityInMs;

    public JwtTokenProvider(@Value("${ksp.jwt.secret:${JWT_SECRET:ChangeMeSecret}}") String secret,
                            @Value("${ksp.jwt.access-expiry-minutes:60}") long accessExpiryMinutes,
                            @Value("${ksp.jwt.refresh-expiry-hours:24}") long refreshExpiryHours) {
        this.signingKey = deriveKey(secret);
        this.accessValidityInMs = accessExpiryMinutes * 60 * 1000;
        this.refreshValidityInMs = refreshExpiryHours * 60 * 60 * 1000;
    }

    private static SecretKey deriveKey(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public String createToken(String subject) {
        return createToken(subject, "ANALYST");
    }

    public String createToken(String subject, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessValidityInMs);
        return Jwts.builder()
                .subject(subject)
                .claim("type", "access")
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public String getRole(String token) {
        return parseClaims(token).getPayload().get("role", String.class);
    }

    public String createRefreshToken(String subject) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + refreshValidityInMs);
        return Jwts.builder()
                .subject(subject)
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jws<Claims> claims = parseClaims(token);
            return "access".equals(claims.getPayload().get("type", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateRefreshToken(String token) {
        try {
            Jws<Claims> claims = parseClaims(token);
            return "refresh".equals(claims.getPayload().get("type", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getSubject(String token) {
        return parseClaims(token).getPayload().getSubject();
    }

    private Jws<Claims> parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token);
    }
}
