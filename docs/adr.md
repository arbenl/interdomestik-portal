# Architecture Decision Records (ADR)

**Author:** Manus AI  
**Date:** December 2024  
**Version:** 1.0  

## Overview

This document captures the key architectural decisions made for the Interdomestik Member Portal project, with particular emphasis on cost optimization, security, and operational simplicity. These decisions were made to ensure the system operates within strict budget constraints while maintaining security and functionality requirements.

## ADR-001: Cost-First Architecture Approach

### Status
Accepted

### Context
The project has a hard budget constraint of €0.50/member/year at 1-5k members scale, excluding staff time. This requires careful consideration of every architectural choice to minimize operational costs while maintaining functionality.

### Decision
We will implement a "Lean Mode" architecture with the following cost-optimized choices:

**Authentication Strategy:** Email-link authentication with passkeys as optional enhancement, avoiding SMS costs entirely. This decision eliminates the recurring SMS costs that could quickly exceed budget at scale.

**Analytics Approach:** Two-tier system with Tier 1 (in-app rollups) as default and Tier 2 (BigQuery + Looker Studio) as feature-flagged option. The default approach uses scheduled Cloud Functions to maintain lightweight rollups in Firestore, avoiding BigQuery costs until explicitly needed.

**Logging Strategy:** INFO level sampling in production with DEBUG only in development/staging environments. Log retention set to 90 days to balance debugging needs with storage costs.

**Function Configuration:** Gen2 Cloud Functions with no minimum instances, allowing true pay-per-use scaling. This prevents idle costs during low-traffic periods.

**Observability:** Cloud Trace disabled in production by default, enabled via feature flag only when debugging is required. This prevents continuous monitoring costs while maintaining debugging capability.

### Consequences
**Positive:**
- Predictable cost structure within budget constraints
- Ability to scale cost-effectively from 1 to 5k members
- Clear upgrade path when budget allows for enhanced features

**Negative:**
- Limited real-time analytics without Tier 2 activation
- Reduced observability in production requires more careful monitoring
- Email-only authentication may have lower conversion than SMS

### Alternatives Considered
- SMS authentication: Rejected due to per-message costs
- Always-on BigQuery: Rejected due to query and storage costs
- Verbose logging: Rejected due to storage and processing costs

## ADR-002: Firebase-Centric Technology Stack

### Status
Accepted

### Context
Need for a managed, scalable platform that minimizes operational overhead while providing necessary features for authentication, data storage, and hosting.

### Decision
Adopt Firebase as the primary platform with the following services:

**Hosting:** Firebase Hosting with CDN for static content delivery
**Authentication:** Firebase Auth with custom claims for role-based access
**Database:** Firestore in EU region for GDPR compliance
**Functions:** Cloud Functions (Node 22 LTS) in europe-west1 region
**Email:** Trigger Email for transactional messaging

### Rationale
Firebase provides a cohesive ecosystem that reduces integration complexity and operational overhead. The managed nature of these services aligns with the cost-optimization goals by eliminating infrastructure management costs.

### Consequences
**Positive:**
- Reduced operational complexity
- Built-in scaling and reliability
- Integrated security model
- EU region availability for compliance

**Negative:**
- Vendor lock-in to Google Cloud Platform
- Limited customization compared to self-hosted solutions
- Pricing model changes could impact long-term costs

## ADR-003: Vanilla JavaScript Frontend

### Status
Accepted

### Context
Need for a lightweight, maintainable frontend that minimizes build complexity and loading times while supporting modern web standards.

### Decision
Use vanilla HTML/CSS/JavaScript with Tailwind CSS for styling, avoiding heavy frameworks like React or Vue.

### Rationale
This approach minimizes bundle size, reduces build complexity, and eliminates framework-specific dependencies. The resulting application loads faster and requires less maintenance overhead.

### Consequences
**Positive:**
- Faster loading times
- Reduced build complexity
- Lower maintenance overhead
- Better performance on mobile devices

**Negative:**
- More verbose code for complex interactions
- Manual state management
- Limited component reusability

## ADR-004: Security-First Data Model

### Status
Accepted

### Context
Need to protect member data while enabling necessary functionality for different user roles (member, agent, admin).

### Decision
Implement a security-first data model with the following principles:

**Minimal PII Storage:** Store only essential personal information, using HMAC for sensitive ID uniqueness checks
**Role-Based Access Control:** Custom claims in Firebase Auth combined with Firestore security rules
**Audit Logging:** Append-only audit logs for all administrative actions
**Data Isolation:** Clear separation between user roles with region-based access controls for agents

### Consequences
**Positive:**
- Strong security posture
- GDPR compliance foundation
- Clear audit trail
- Principle of least privilege

**Negative:**
- More complex data access patterns
- Additional development overhead for security checks
- Potential performance impact from security validations

## ADR-005: Feature Flag Architecture

### Status
Accepted

### Context
Need to control feature rollout and manage costs dynamically without requiring code deployments.

### Decision
Implement Remote Config-based feature flags for key functionality:

- `TRACE_ENABLED`: Control Cloud Trace in production
- `ANALYTICS_TIER`: Switch between Tier 1 and Tier 2 analytics
- `PUSH_ENABLED`: Control web push notifications
- `PASSKEYS_BETA`: Control passkey authentication availability
- `AGENT_CREATE_ENABLED`: Global kill switch for agent registration

### Rationale
Feature flags provide operational flexibility to manage costs and features dynamically. This is particularly important for cost-sensitive features like Cloud Trace and BigQuery analytics.

### Consequences
**Positive:**
- Dynamic cost control
- Safe feature rollout
- Emergency kill switches
- A/B testing capability

**Negative:**
- Additional complexity in code paths
- Potential for configuration drift
- Need for flag lifecycle management

## ADR-006: Idempotent Function Design

### Status
Accepted

### Context
Need to ensure reliable operation in distributed environment while preventing duplicate operations that could impact costs or data integrity.

### Decision
Design all Cloud Functions to be idempotent with explicit tracking of operation completion:

- `upsertProfile`: Track `welcomeSentAt` to prevent duplicate welcome emails
- `startMembership`: Track `activationSentAt` to prevent duplicate activation emails
- `dailyExpireMemberships`: Use reminder ledger to prevent duplicate reminder emails

### Rationale
Idempotent operations ensure system reliability and prevent cost overruns from duplicate email sends or data operations.

### Consequences
**Positive:**
- Reliable operation under retry scenarios
- Cost protection from duplicate operations
- Simplified error recovery

**Negative:**
- Additional complexity in function logic
- Need for careful state tracking
- Potential for state inconsistencies if not properly implemented

## Implementation Guidelines

### Cost Monitoring
All architectural decisions should be validated against the €0.50/member/year budget constraint. Regular cost analysis should be performed to ensure decisions remain valid as the system scales.

### Security Validation
Security decisions should be regularly reviewed against current best practices and compliance requirements. The security-first approach should be maintained even as features are added.

### Performance Considerations
While cost optimization is primary, performance should not be sacrificed to the point of poor user experience. The vanilla JavaScript approach should be supplemented with performance monitoring to ensure acceptable loading times.

### Scalability Planning
Architectural decisions should support scaling from 1 to 5k members without requiring fundamental changes. The two-tier analytics approach exemplifies this principle by providing an upgrade path when needed.

---

*This document will be updated as new architectural decisions are made or existing decisions are revised.*

