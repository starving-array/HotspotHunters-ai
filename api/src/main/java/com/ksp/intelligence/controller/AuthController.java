package com.ksp.intelligence.controller;

import com.ksp.intelligence.model.domain.KspUser;
import com.ksp.intelligence.repository.KspUserRepository;
import com.ksp.intelligence.security.JwtTokenProvider;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final JwtTokenProvider tokenProvider;
    private final KspUserRepository userRepo;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(JwtTokenProvider tokenProvider,
                          KspUserRepository userRepo,
                          BCryptPasswordEncoder passwordEncoder) {
        this.tokenProvider = tokenProvider;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> login(@RequestBody Map<String, String> creds, HttpServletResponse response) {
        String username = creds.getOrDefault("username", "").trim();
        String password = creds.getOrDefault("password", "");
        if (username.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("error", "Username is required"));
        }

        var userOpt = userRepo.findByUsernameAndActiveTrue(username);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getHashedPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        KspUser user = userOpt.get();
        String token = tokenProvider.createToken(user.getUsername(), user.getRole());
        String refreshToken = tokenProvider.createRefreshToken(user.getUsername());

        setCookie(response, "jwt_token", token, 60 * 60);
        setCookie(response, "jwt_refresh", refreshToken, 24 * 60 * 60);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "refreshToken", refreshToken,
                "role", user.getRole(),
                "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()
        ));
    }

    @PostMapping(value = "/refresh", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> refresh(@RequestBody Map<String, String> body, HttpServletResponse response) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || !tokenProvider.validateRefreshToken(refreshToken)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired refresh token"));
        }
        String username = tokenProvider.getSubject(refreshToken);
        var userOpt = userRepo.findByUsernameAndActiveTrue(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found or inactive"));
        }
        String newToken = tokenProvider.createToken(userOpt.get().getUsername(), userOpt.get().getRole());
        String newRefreshToken = tokenProvider.createRefreshToken(username);

        setCookie(response, "jwt_token", newToken, 60 * 60);
        setCookie(response, "jwt_refresh", newRefreshToken, 24 * 60 * 60);

        return ResponseEntity.ok(Map.of(
                "token", newToken,
                "refreshToken", newRefreshToken
        ));
    }

    @GetMapping(value = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        String username = auth.getName();
        var userOpt = userRepo.findByUsernameAndActiveTrue(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        KspUser user = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "role", user.getRole(),
                "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()
        ));
    }

    @PostMapping(value = "/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        clearCookie(response, "jwt_token");
        clearCookie(response, "jwt_refresh");
        return ResponseEntity.ok().build();
    }

    private void setCookie(HttpServletResponse response, String name, String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSeconds);
        response.addCookie(cookie);
    }

    private void clearCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
