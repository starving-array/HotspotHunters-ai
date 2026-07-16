# =============================================================================
# KSP Intelligence Portal — Spring Boot API Multi-stage Dockerfile
# File: api/Dockerfile
#
# Two stages:
#   stage 1 — maven:3.9-eclipse-temurin-17 to build the fat jar
#   stage 2 — eclipse-temurin:17-jre-alpine to run (much smaller image)
#
# Phase 2 build never runs tests inside the image (the host CI does that).
# For local build with tests use:  docker compose build --build-arg RUN_TESTS=true spring-boot-api
# =============================================================================

# ---------- Stage 1: build ----------
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

# Pre-copy pom to cache dependency resolution across code changes
COPY pom.xml /build/pom.xml
RUN mvn -B -q dependency:go-offline

# Copy source and build (tests skipped at image-build time)
COPY src /build/src
RUN mvn -B -q clean package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Optional: install curl for in-container healthcheck debugging
RUN apk add --no-cache curl

# Copy the Spring Boot fat jar produced in stage 1
COPY --from=builder /build/target/*-SNAPSHOT.jar /app/app.jar

# JVM runs in container — always use GC suited to low-memory Docker environments
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
