# Operational Runbooks

**Author:** Manus AI  
**Date:** December 2024  
**Version:** 1.0  

## Overview

This document provides operational procedures for the Interdomestik Member Portal, covering backup/restore, incident response, rollback procedures, secrets management, and cost monitoring. These runbooks are designed to ensure reliable operation and quick recovery from issues.




## Backup and Restore Procedures

### Daily Firestore Backup

The system automatically performs daily Firestore exports to a European Cloud Storage bucket with 30-day retention. This process is managed through scheduled Cloud Functions and provides point-in-time recovery capability.

**Automated Backup Process:**
The daily backup runs at 03:00 CET and exports all Firestore collections to `gs://interdomestik-backups-eu/firestore/YYYY/MM/DD/`. The backup includes all member data, user roles, memberships, and audit logs while excluding temporary collections like `mail/*` which have their own TTL policies.

**Monitoring Backup Success:**
Backup completion is logged to Cloud Logging with success/failure status. Failed backups trigger alerts to the admin team via email. The backup function includes retry logic for transient failures and detailed error reporting for persistent issues.

**Manual Backup Trigger:**
In case of emergency or before major changes, administrators can trigger manual backups using the Firebase CLI:

```bash
gcloud firestore export gs://interdomestik-backups-eu/firestore/manual/$(date +%Y%m%d_%H%M%S) --project=interdomestik-portal
```

### Monthly Snapshot Creation

In addition to daily exports, the system creates monthly snapshots that are retained for one year. These snapshots provide long-term recovery points and support compliance requirements for data retention.

**Snapshot Process:**
Monthly snapshots are created on the first day of each month and include a complete copy of all Firestore data along with metadata about the system state at the time of snapshot creation. These snapshots are stored in a separate bucket with different retention policies.

### Restore Procedures

**Point-in-Time Restore:**
To restore from a specific backup, administrators must first create a new Firestore database and then import the backup data. This process requires careful coordination to prevent data conflicts and ensure user access continuity.

The restore process involves several steps: First, identify the appropriate backup based on the desired restore point. Second, create a new Firestore database or clear the existing one if appropriate. Third, import the backup data using the Firebase CLI. Fourth, update application configuration to point to the restored database. Finally, verify data integrity and user access functionality.

**Partial Restore:**
For recovering specific collections or documents, administrators can perform selective imports from backup files. This approach is useful when only certain data has been corrupted or accidentally deleted.

**Testing Restore Procedures:**
Restore procedures should be tested quarterly using staging environment data to ensure the process works correctly and administrators are familiar with the steps. These tests should include both full and partial restore scenarios.

### Backup Verification

**Data Integrity Checks:**
Each backup includes checksums and metadata to verify data integrity. The backup process validates that all expected collections are present and contain the expected number of documents.

**Recovery Testing:**
Monthly recovery tests are performed in the staging environment to ensure backups can be successfully restored and that the restored data is functional. These tests include verifying user authentication, data access permissions, and application functionality.


## Incident Response and Rollback Procedures

### Incident Classification

**Severity Levels:**
Incidents are classified into four severity levels to ensure appropriate response times and resource allocation. Severity 1 incidents involve complete system outage or security breaches affecting all users. Severity 2 incidents involve partial system outage or degraded performance affecting multiple users. Severity 3 incidents involve minor functionality issues affecting individual users or specific features. Severity 4 incidents involve cosmetic issues or enhancement requests that do not impact functionality.

**Response Times:**
Each severity level has defined response time requirements. Severity 1 incidents require immediate response within 15 minutes and resolution target of 2 hours. Severity 2 incidents require response within 1 hour and resolution target of 8 hours. Severity 3 incidents require response within 4 hours and resolution target of 24 hours. Severity 4 incidents require response within 24 hours and resolution target of 1 week.

### Incident Response Process

**Initial Response:**
When an incident is detected, either through monitoring alerts or user reports, the on-call administrator immediately assesses the severity level and begins the response process. This includes acknowledging the incident, gathering initial information about symptoms and impact, and determining if escalation is needed.

**Investigation and Diagnosis:**
The response team investigates the root cause using available monitoring tools, logs, and system metrics. This phase involves checking Cloud Function execution logs, Firestore operation metrics, authentication service status, and frontend application performance. The team documents findings and maintains communication with stakeholders about progress.

**Resolution and Recovery:**
Once the root cause is identified, the team implements the appropriate fix, which may involve code changes, configuration updates, or infrastructure adjustments. After implementing the fix, the team verifies that the issue is resolved and monitors for any recurring problems.

**Post-Incident Review:**
After resolution, the team conducts a post-incident review to identify lessons learned and prevent similar issues in the future. This review includes documenting the timeline of events, analyzing the effectiveness of the response, and identifying any process improvements needed.

### Rollback Procedures

**Automated Rollback Triggers:**
The CI/CD pipeline includes automated smoke tests that run after each deployment. If these tests fail, the system can automatically trigger a rollback to the previous known good version. The smoke tests verify critical functionality including user authentication, profile creation, and admin access.

**Manual Rollback Process:**
Administrators can manually trigger rollbacks using the GitHub Actions workflow when automated rollback is not sufficient or when issues are discovered after the automated tests pass. The manual rollback process involves identifying the last known good deployment tag, triggering the rollback workflow, and verifying that the rollback was successful.

**Rollback Verification:**
After any rollback, the team must verify that the system is functioning correctly by running a comprehensive test suite that covers all major functionality. This includes testing user registration, authentication, profile management, membership activation, and admin functions.

**Database Rollback Considerations:**
Database rollbacks are more complex than application rollbacks because they may involve data loss. The team must carefully evaluate whether database changes need to be reverted and coordinate with stakeholders about potential data loss implications.

### Emergency Procedures

**Break-Glass Access:**
In emergency situations where normal access methods are not available, administrators can use the break-glass admin account stored offline. This account has full system access and should only be used when other access methods have failed.

**Kill Switch Activation:**
The system includes feature flags that can serve as kill switches for problematic functionality. Administrators can quickly disable agent registration, email sending, or other features if they are causing issues. These kill switches can be activated through Firebase Remote Config without requiring code deployments.

**Communication Protocols:**
During incidents, the team maintains communication with users through status page updates and direct notifications to administrators. The communication includes regular updates about the incident status, expected resolution time, and any workarounds available to users.


## Secrets Management

### Secret Storage and Access

**GitHub Secrets:**
Sensitive configuration values are stored as GitHub Secrets and accessed during CI/CD workflows. These secrets include Firebase service account keys, API tokens, and deployment credentials. Access to GitHub Secrets is restricted to repository administrators and the secrets are encrypted at rest.

**Firebase Functions Configuration:**
Runtime configuration for Cloud Functions is managed through Firebase Functions configuration, which provides secure storage for environment-specific values. This includes database connection strings, external API keys, and feature flag defaults.

**Secret Rotation:**
All secrets should be rotated on a regular schedule to maintain security. Service account keys are rotated quarterly, API tokens are rotated monthly, and deployment credentials are rotated after any personnel changes. The rotation process includes updating all systems that use the secrets and verifying that the new secrets work correctly.

**Access Control:**
Access to secrets is controlled through role-based permissions that align with the principle of least privilege. Only administrators who need access to specific secrets for their responsibilities are granted access. All secret access is logged and monitored for unusual activity.

### Secret Management Procedures

**Adding New Secrets:**
When new secrets are needed, they should be added through the appropriate secure channel (GitHub Secrets or Firebase Functions config) and documented in the secret inventory. The documentation should include the purpose of the secret, who has access, and the rotation schedule.

**Emergency Secret Revocation:**
If a secret is compromised or suspected of being compromised, it should be immediately revoked and replaced. This process includes generating a new secret, updating all systems that use it, revoking the old secret, and investigating how the compromise occurred.

**Secret Auditing:**
Regular audits of secret usage and access are performed to ensure that only necessary secrets exist and that access is properly controlled. These audits include reviewing who has access to each secret, when secrets were last rotated, and whether any secrets are no longer needed.

## Cost Monitoring and Management

### Monthly Cost Reporting

**Automated Cost Reports:**
The system generates monthly cost reports that are automatically emailed to administrators. These reports include detailed breakdowns of costs by service (Firestore operations, Cloud Functions invocations, hosting bandwidth, email sending) and projections for the annual budget based on current usage patterns.

**Cost Tracking Metrics:**
Key cost metrics are tracked continuously, including Firestore read/write operations per member, Cloud Function invocation frequency, email sending volume, and hosting bandwidth usage. These metrics are compared against budget targets to identify potential cost overruns early.

**Budget Alerts:**
Budget alerts are configured at multiple thresholds (50%, 75%, 90% of monthly budget) to provide early warning of potential cost overruns. When alerts are triggered, administrators receive immediate notifications and can take corrective action such as activating cost-saving features or investigating unusual usage patterns.

### Cost Optimization Procedures

**Feature Flag Management:**
Cost-sensitive features are controlled through feature flags that can be quickly disabled if costs exceed budget. This includes Cloud Trace in production, BigQuery analytics, and web push notifications. Administrators can monitor the cost impact of each feature and make informed decisions about which features to enable.

**Usage Pattern Analysis:**
Regular analysis of usage patterns helps identify opportunities for cost optimization. This includes analyzing peak usage times, identifying inefficient queries or operations, and optimizing data access patterns to reduce costs.

**Scaling Adjustments:**
As the member base grows, cost per member should remain within budget targets. If costs begin to exceed targets, administrators can implement scaling adjustments such as optimizing database queries, adjusting function memory allocation, or implementing more aggressive caching strategies.

### Emergency Cost Controls

**Immediate Cost Reduction:**
If costs suddenly spike beyond acceptable levels, administrators can implement immediate cost reduction measures. These include disabling non-essential features through feature flags, implementing rate limiting on expensive operations, and temporarily reducing log retention periods.

**Cost Investigation:**
When unexpected cost increases occur, administrators should immediately investigate the root cause. This includes analyzing service usage metrics, reviewing recent deployments or configuration changes, and checking for any unusual user activity that might be driving increased costs.

**Budget Recovery Plans:**
If monthly costs exceed budget, administrators should implement recovery plans to bring annual costs back on track. This may include temporarily disabling optional features, optimizing expensive operations, or adjusting service configurations to reduce costs in subsequent months.

---

*These runbooks should be reviewed and updated quarterly to ensure they remain current with system changes and operational experience.*

