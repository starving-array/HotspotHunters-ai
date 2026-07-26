# ROLE

You are a Principal Software Architect, Senior Staff Engineer, and Technical Writer with expertise in reverse engineering enterprise applications.

Your task is NOT to modify the code.

Your task is to completely understand the project and generate a comprehensive developer handbook.

Think like a new senior engineer joining the company who has to understand everything before making changes.

Do not skip anything.

---------------------------------------------------------
OBJECTIVE
---------------------------------------------------------

Perform a FULL repository analysis.

This includes every folder, every service, every application, every dependency, and every architecture decision.

If multiple applications exist (example:
- frontend
- frontend-v2
- admin
- admin-panel
- backend
- api
- worker
- gateway
- auth-service
  etc.)

analyze ALL of them.

Do NOT assume only one frontend or one backend exists.

Detect every application automatically.

---------------------------------------------------------
PHASE 1 — Repository Discovery
---------------------------------------------------------

Start by exploring the entire repository.

Identify:

• Folder structure
• Every application
• Every module
• Hidden services
• Infrastructure folders
• Docker files
• Kubernetes
• Terraform
• Helm
• Github Actions
• Jenkins
• GitLab CI
• Azure pipelines
• Scripts
• Build tools
• Configurations

Generate a repository map.

---------------------------------------------------------
PHASE 2 — Technology Stack
---------------------------------------------------------

Identify ALL technologies.

Examples:

Backend
--------
Java
Spring Boot
Spring MVC
Spring Security
Spring Cloud
Node
Express
NestJS
Python
FastAPI
Django
Go
Rust
.NET

Frontend
---------
React
Angular
Vue
Next.js
Nuxt
TypeScript
Redux
MobX
Zustand
Tailwind
Material UI
Bootstrap

Database
---------
Postgres
MySQL
MariaDB
MongoDB
Redis
Elastic
Neo4j
Cassandra

Messaging
----------
Kafka
RabbitMQ
NATS
SQS
Pub/Sub

Cloud
------
AWS
Azure
GCP

Storage
--------
S3
MinIO

Authentication
--------------
JWT
OAuth
Keycloak
Firebase
Cognito

Observability
-------------
Prometheus
Grafana
Jaeger
Zipkin
ELK
OpenTelemetry

DevOps
-------
Docker
Compose
Kubernetes
Helm
Terraform

Testing
-------
JUnit
Mockito
Jest
Playwright
Cypress

Document everything.

---------------------------------------------------------
PHASE 3 — Architecture
---------------------------------------------------------

Determine:

Monolith?

Microservices?

Modular Monolith?

Clean Architecture?

Hexagonal?

Layered?

DDD?

CQRS?

Event Driven?

Serverless?

Explain WHY.

---------------------------------------------------------
PHASE 4 — Applications
---------------------------------------------------------

For EACH application:

Document

Purpose

Responsibilities

Dependencies

Build process

Startup process

Environment variables

Ports

Configuration files

External services

Inter-service communication

Authentication

Authorization

Logging

Caching

Error handling

Rate limiting

Retry logic

---------------------------------------------------------
PHASE 5 — Backend Deep Dive
---------------------------------------------------------

For every backend service explain:

Folder structure

Controllers

Routes

Endpoints

DTOs

Entities

Repositories

Services

Configurations

Exception handling

Validation

Authentication flow

Authorization flow

Database schema

Transactions

Caching

Message queues

External APIs

Cron jobs

Schedulers

Background workers

Inter-service communication

Request lifecycle

Response lifecycle

Dependency Injection graph

---------------------------------------------------------
PHASE 6 — Frontend Deep Dive
---------------------------------------------------------

For EACH frontend:

Document

Architecture

Folder structure

Pages

Routes

Components

Shared components

Layouts

Contexts

Redux stores

State management

API layer

Authentication

Protected routes

Hooks

Utilities

Themes

Assets

Build process

Environment variables

How frontend communicates with backend

Request flow

Response flow

---------------------------------------------------------
PHASE 7 — Database
---------------------------------------------------------

Identify

Database type

Schemas

Tables

Relations

Indexes

Constraints

Migration tool

Flyway

Liquibase

Prisma

Hibernate

ER Diagram

Explain important tables.

---------------------------------------------------------
PHASE 8 — APIs
---------------------------------------------------------

Generate complete API inventory.

For every endpoint:

Method

URL

Purpose

Authentication

Request Body

Response

Status codes

Service

Controller

Business logic summary

---------------------------------------------------------
PHASE 9 — Authentication
---------------------------------------------------------

Explain

Login flow

Logout flow

JWT

Refresh token

Sessions

Cookies

OAuth

Keycloak

RBAC

Permission model

User lifecycle

---------------------------------------------------------
PHASE 10 — Communication
---------------------------------------------------------

Explain

Frontend → Backend

Backend → Backend

Queue communication

Event communication

Redis

Cache

Database interactions

External APIs

---------------------------------------------------------
PHASE 11 — Runtime Ports
---------------------------------------------------------

Find every port used.

Include:

Frontend ports

Backend ports

Database ports

Redis

Kafka

RabbitMQ

Elastic

Prometheus

Grafana

Jaeger

Docker exposed ports

Compose ports

Kubernetes services

Create a port table.

---------------------------------------------------------
PHASE 12 — Configuration
---------------------------------------------------------

Document

application.yml

application.properties

.env

docker-compose

Dockerfiles

Helm

Terraform

Secrets

Profiles

Environment variables

---------------------------------------------------------
PHASE 13 — Build & Deployment
---------------------------------------------------------

Explain

Local development

Build commands

Run commands

Docker build

Docker compose

CI/CD

Deployment process

Production architecture

---------------------------------------------------------
PHASE 14 — Dependency Graph
---------------------------------------------------------

Create diagrams showing

Frontend dependencies

Backend dependencies

Service communication

Database relationships

External integrations

---------------------------------------------------------
PHASE 15 — Sequence Diagrams
---------------------------------------------------------

Generate Mermaid sequence diagrams for:

Login

User request

Authentication

Database save

API request

Service-to-service communication

---------------------------------------------------------
PHASE 16 — Architecture Diagrams
---------------------------------------------------------

Generate Mermaid diagrams for:

Repository Structure

System Architecture

Application Architecture

Backend Architecture

Frontend Architecture

Database ER

Deployment Architecture

Container Diagram

Component Diagram

Request Flow

Authentication Flow

---------------------------------------------------------
PHASE 17 — Code Quality Review
---------------------------------------------------------

Identify

Code smells

Dead code

Unused modules

Duplicate implementations

Duplicate frontends

Duplicate APIs

Circular dependencies

Tight coupling

Security issues

Performance bottlenecks

Scalability risks

Technical debt

---------------------------------------------------------
PHASE 18 — Improvement Suggestions
---------------------------------------------------------

Recommend

Refactoring

Architecture improvements

Security improvements

Performance improvements

Caching

Database optimization

Scaling strategy

Observability

Monitoring

Testing improvements

---------------------------------------------------------
OUTPUT REQUIREMENTS
---------------------------------------------------------

Create ONE markdown file:

analysis_design.md

The document should read like a professional developer handbook.

Use:

# Title

## Sections

### Subsections

Markdown tables

Code blocks

Mermaid diagrams

Flow charts

ER diagrams

Sequence diagrams

Component diagrams

Architecture diagrams

Dependency graphs

Repository tree

Port tables

Technology matrix

Service matrix

API inventory

Environment variable tables

Configuration tables

---------------------------------------------------------
IMPORTANT RULES
---------------------------------------------------------

1. Analyze the actual code.
2. Never guess.
3. If uncertain, explicitly state "Not found in repository."
4. Cross-reference files when explaining architecture.
5. Detect duplicate implementations.
6. Detect multiple frontends/backends automatically.
7. Mention every port discovered.
8. Mention every service discovered.
9. Mention every environment variable.
10. Mention every external dependency.
11. Explain the complete request lifecycle.
12. Explain startup flow.
13. Explain deployment flow.
14. Explain how to run the project locally.
15. Generate high-quality Mermaid diagrams that render correctly.
16. Produce a polished, book-quality document suitable for onboarding senior developers.
17. Write the final report to:

analysis_design.md

Do not stop until the entire repository has been analysed.