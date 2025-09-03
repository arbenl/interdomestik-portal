# Administrator Guide

**Author:** Manus AI  
**Date:** December 2024  
**Version:** 1.0  

## Overview

This guide provides comprehensive instructions for administrators of the Interdomestik Member Portal. It covers user role management, membership activation and renewal processes, data export procedures, and key performance indicator definitions. This guide is designed to help administrators efficiently manage the system while maintaining security and compliance requirements.


## User Roles and Regions Management

### Understanding User Roles

The Interdomestik Member Portal implements a three-tier role system designed to provide appropriate access levels while maintaining security and operational efficiency. Each role has specific permissions and responsibilities that align with organizational needs and security requirements.

**Member Role:**
Members represent the primary users of the system and have the most restricted access level. They can create and view their own profile information, access their digital membership card, and submit claims (when the feature is enabled). Members cannot access other users' information or perform administrative functions. This role is automatically assigned when users complete the self-registration process.

**Agent Role:**
Agents serve as regional representatives who can assist with member registration and management within their assigned regions. They have elevated permissions that allow them to create member profiles for users in their designated regions, view member information within their regions, and assist with membership-related inquiries. Agents cannot access member information outside their assigned regions or perform system-wide administrative functions.

**Admin Role:**
Administrators have full system access and can perform all functions including user role management, membership activation and renewal, data export, and system configuration. They can access all member information regardless of region, manage user roles and permissions, and perform bulk operations. Admin access should be limited to trusted personnel who require full system access for their responsibilities.

### Role Assignment Procedures

**Assigning Member Role:**
The member role is automatically assigned during the self-registration process and does not require manual intervention. When users complete their profile through the `upsertProfile` function, they are automatically granted member status with access to their own data and basic portal functionality.

**Promoting Users to Agent:**
To assign agent status to a user, administrators use the `setUserRole` function through the admin interface. This process requires specifying the target user's UID, the agent role, and the allowed regions for that agent. The system validates that the requesting user has admin privileges before processing the role change.

The agent assignment process includes several important considerations. First, agents should only be assigned to regions where they have legitimate business need and local knowledge. Second, the assignment should be documented in the audit logs for compliance purposes. Third, agents should be provided with training on their responsibilities and the limitations of their access.

**Granting Admin Access:**
Admin role assignment is the most sensitive operation and should be performed with extreme caution. Only existing administrators can grant admin access to other users, and such assignments should be approved through the organization's standard access control procedures. The process involves using the `setUserRole` function with the admin role designation.

Admin assignments should be documented with justification for the access level, approval from appropriate organizational authority, and scheduled review date. All admin role assignments are logged in the audit trail for security monitoring and compliance purposes.

### Regional Access Management

**Understanding Regional Boundaries:**
The system supports regional access controls that limit agent access to members within specific geographic or organizational boundaries. These regions are defined based on organizational structure and operational needs, ensuring that agents can effectively serve their assigned areas while maintaining data privacy.

**Configuring Agent Regions:**
When assigning agent roles, administrators must specify the allowed regions for each agent. This configuration determines which member records the agent can access and which registration requests they can process. The regional assignment should align with the agent's actual responsibilities and geographic coverage area.

**Managing Regional Changes:**
When organizational boundaries change or agents are reassigned, administrators can update regional access through the role management interface. This process involves modifying the `allowedRegions` array for the affected agent and ensuring that any pending operations are properly transferred or completed.

### Role Verification and Auditing

**Regular Access Reviews:**
The system requires quarterly access reviews to ensure that user roles remain appropriate for current responsibilities. These reviews involve examining all agent and admin assignments, verifying that access levels are still needed, and removing access for users who no longer require elevated permissions.

**Audit Trail Monitoring:**
All role changes are recorded in the audit logs with timestamps, requesting administrator, target user, and specific changes made. Administrators should regularly review these logs to identify any unusual patterns or unauthorized access attempts.

**Role-Based Security Monitoring:**
The system monitors role-based access patterns to identify potential security issues such as agents accessing data outside their assigned regions or unusual admin activity. These monitoring alerts help maintain system security and ensure compliance with access control policies.


## Membership Activation and Renewal

### Understanding Membership Lifecycle

The membership system operates on an annual cycle with distinct states that track the progression from initial registration through active membership and eventual renewal or expiration. Understanding this lifecycle is crucial for effective membership management and ensuring continuous service for members.

**Membership States:**
Memberships progress through several states during their lifecycle. The initial state is "pending" when a member profile is created but membership has not been activated. The "active" state indicates a current, valid membership with full access to member benefits. The "expired" state occurs when a membership term has ended without renewal. The "suspended" state may be used for temporary access restrictions due to administrative or compliance issues.

**Annual Membership Terms:**
Each membership is tied to a specific calendar year and must be renewed annually to maintain active status. The system tracks membership periods using the year as the primary identifier, allowing members to have multiple membership records over time while maintaining historical data for reporting and compliance purposes.

### Membership Activation Process

**Manual Activation Workflow:**
Administrators activate memberships through the admin interface using the `startMembership` function. This process requires specifying the member's UID, the membership year, and the membership price. The system validates the administrator's permissions and processes the activation request.

The activation process includes several automated steps that ensure data consistency and member communication. First, the system creates or updates the membership record with active status and appropriate dates. Second, an activation email is sent to the member with their digital membership card. Third, the system updates relevant metrics and rollup data for reporting purposes.

**Idempotent Activation:**
The activation process is designed to be idempotent, meaning that multiple activation attempts for the same member and year will not result in duplicate emails or data inconsistencies. If a membership is already active for the specified year, the system returns a success message without sending additional emails or making unnecessary changes.

**Batch Activation:**
For efficiency during renewal periods or when processing multiple new memberships, administrators can use the bulk upload feature to activate multiple memberships simultaneously. This process involves uploading a CSV file with member information and having the system process each activation request while providing detailed feedback about successes and failures.

### Renewal Management

**Renewal Reminder System:**
The system automatically manages renewal reminders through the `dailyExpireMemberships` scheduled function. This process identifies memberships approaching expiration and sends reminder emails at 30 days, 7 days, and 1 day before expiration. The reminder system uses a ledger approach to prevent duplicate reminders and track communication history.

**Expiring Membership Queue:**
The admin dashboard includes an "expiring soon" queue that shows memberships requiring attention. This queue helps administrators proactively manage renewals and identify members who may need additional assistance with the renewal process. The queue can be filtered by region, membership type, or other criteria to facilitate targeted outreach.

**Renewal Processing:**
When members decide to renew, administrators process the renewal by activating a new membership for the upcoming year. This process maintains the historical record of previous memberships while creating a new active membership for the current period. The system handles the transition automatically, ensuring continuous access for renewing members.

### Membership Data Management

**Membership History:**
The system maintains complete membership history for each member, allowing administrators to view past memberships, payment records, and status changes. This historical data supports compliance requirements, member service inquiries, and organizational reporting needs.

**Price Management:**
Membership prices can vary by year, region, or member type, and administrators can specify the appropriate price during activation. The system records the price paid for each membership period, supporting financial reporting and audit requirements.

**Status Tracking:**
All membership status changes are tracked with timestamps and administrator information, creating a complete audit trail for compliance and troubleshooting purposes. This tracking includes activation dates, expiration dates, and any manual status changes made by administrators.

### Special Situations

**Late Renewals:**
When members renew after their membership has expired, administrators can activate the new membership with an appropriate start date. The system accommodates various renewal scenarios while maintaining data integrity and ensuring proper access control.

**Membership Transfers:**
In cases where membership needs to be transferred between individuals or regions, administrators can manage the transfer process through careful coordination of profile updates and membership activations. These transfers should be documented in the audit logs with appropriate justification.

**Refunds and Cancellations:**
When memberships need to be cancelled or refunded, administrators can update the membership status and document the reason for the change. The system maintains the historical record while preventing continued access to member benefits.


## CSV Export Procedures

### Understanding Export Permissions

The CSV export functionality is restricted to administrators only, ensuring that sensitive member data is only accessible to authorized personnel. This restriction aligns with data protection requirements and organizational security policies. Agents do not have export capabilities in the MVP version, maintaining clear separation of access levels.

**Export Data Sources:**
CSV exports are generated from the Tier 1 rollup data rather than directly from member records, providing aggregated information while protecting individual member privacy. This approach ensures that exports contain statistical and summary information suitable for reporting and analysis without exposing detailed personal information unnecessarily.

**Export Scope and Limitations:**
The current export functionality focuses on membership statistics, regional breakdowns, and trend analysis. Exports include member counts by region, membership status distributions, and temporal trends but do not include personally identifiable information such as names, email addresses, or detailed profile data.

### Export Generation Process

**Accessing Export Functions:**
Administrators can generate CSV exports through the admin dashboard interface. The export function is prominently displayed in the admin section and requires confirmation before processing to prevent accidental data exports. The system validates administrator permissions before allowing access to export functionality.

**Export Types Available:**
Several export types are available to support different reporting needs. Regional breakdown exports provide member counts and statistics organized by geographic region. Temporal exports show membership trends over time, including monthly and yearly comparisons. Status exports provide current membership status distributions and renewal pipeline information.

**Export File Format:**
Exported files follow a standardized CSV format with clear column headers and consistent data formatting. The files include metadata such as export date, data period covered, and administrator who generated the export. This standardization ensures compatibility with common analysis tools and maintains consistency across different export types.

### Data Privacy and Security

**Export Audit Trail:**
All export operations are logged in the audit trail with details about the administrator who performed the export, the type of data exported, and the timestamp of the operation. This audit trail supports compliance requirements and helps monitor data access patterns.

**Data Minimization:**
Exports are designed to include only the minimum data necessary for the intended purpose, following data minimization principles. Personal identifiers are excluded from standard exports, and aggregated data is used whenever possible to protect individual privacy while providing useful insights.

**Secure Handling:**
Exported files should be handled according to organizational data security policies, including secure storage, limited distribution, and appropriate disposal when no longer needed. Administrators are responsible for ensuring that exported data is used only for authorized purposes and is protected according to applicable privacy regulations.

## Key Performance Indicators (KPI) Glossary

### Membership Metrics

**Total Members:**
This metric represents the cumulative number of individuals who have created member profiles in the system, regardless of their current membership status. It includes all members who have ever registered, providing insight into the overall reach and growth of the organization's membership base over time.

**Active Memberships:**
Active memberships count the number of current, valid memberships for the current year. This metric excludes expired memberships and provides the most accurate picture of current member engagement and revenue potential. It is the primary metric for understanding current organizational capacity and member services demand.

**Membership Conversion Rate:**
This metric tracks the percentage of registered members who proceed to activate paid memberships. It provides insight into the effectiveness of the registration process and member engagement strategies. A low conversion rate may indicate issues with the activation process or member value proposition.

**Regional Distribution:**
Regional distribution metrics show how memberships are distributed across different geographic or organizational regions. This information helps with resource allocation, regional program planning, and identifying areas for growth or additional support.

### Operational Metrics

**Expiring Soon:**
This metric tracks memberships that will expire within the next 30 days, providing early warning for renewal outreach and revenue planning. It helps administrators proactively manage the renewal process and identify members who may need additional assistance or incentives to renew.

**Renewal Rate:**
The renewal rate measures the percentage of expiring memberships that are successfully renewed for the following year. This metric is crucial for understanding member satisfaction, program effectiveness, and long-term organizational sustainability.

**Agent Activity:**
Agent activity metrics track the number of member registrations processed by agents, regional distribution of agent activity, and agent productivity measures. These metrics help evaluate agent performance and identify training or support needs.

**System Performance:**
System performance metrics include response times for key functions, error rates, and availability statistics. These technical metrics ensure that the system is meeting performance requirements and providing a good user experience.

### Financial Metrics

**Revenue per Member:**
This metric calculates the average revenue generated per active member, helping with financial planning and pricing strategy evaluation. It provides insight into the financial sustainability of membership programs and helps identify opportunities for revenue optimization.

**Cost per Member:**
Cost per member tracks the operational costs associated with serving each member, including technology costs, administrative overhead, and support expenses. This metric is crucial for ensuring that the system operates within budget constraints and identifies opportunities for cost optimization.

**Monthly Recurring Revenue (MRR):**
Although memberships are annual, MRR provides a normalized view of revenue flow that helps with financial planning and trend analysis. It is calculated by dividing annual membership revenue by twelve months.

### Engagement Metrics

**Login Frequency:**
This metric tracks how often members access the portal, providing insight into member engagement and system utility. Low login frequency may indicate issues with system usability or member value perception.

**Feature Utilization:**
Feature utilization metrics track which portal features are most commonly used by members, helping prioritize development efforts and identify underutilized capabilities that may need improvement or better promotion.

**Support Request Volume:**
The number and type of support requests provide insight into system usability, member satisfaction, and areas where additional documentation or training may be needed.

### Compliance and Security Metrics

**Audit Log Activity:**
This metric tracks the volume and types of administrative actions recorded in audit logs, helping ensure that system access is being used appropriately and identifying any unusual activity patterns.

**Data Export Frequency:**
Tracking how often data exports are performed and by whom helps ensure that data access is being used for legitimate purposes and supports compliance with data protection requirements.

**Security Incident Count:**
The number and severity of security incidents provide insight into system security effectiveness and help identify areas where additional security measures may be needed.

---

*This guide should be updated as new features are added or procedures change. Administrators should refer to the latest version for current procedures and requirements.*

