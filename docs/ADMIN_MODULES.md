# Admin Modules

This document provides an overview of the modular architecture of the admin section.

The `Admin.tsx` page has been refactored into a thin shell that lazily loads feature panels. Each panel is responsible for a specific set of admin functionalities.

## Panels

| Panel                 | Responsibilities                                                              | Location                            |
| :-------------------- | :---------------------------------------------------------------------------- | :---------------------------------- |
| **EmulatorPanel**     | Provides controls for seeding and clearing the Firebase emulator.             | `src/features/admin/emulator/`      |
| **RoleManagerPanel**  | Allows admins to find users, view their claims, and assign roles.             | `src/features/admin/role-manager/`  |
| **MetricsPanel**      | Displays daily metrics, such as the number of new activations.                | `src/features/admin/metrics/`       |
| **OrgPanel**          | Manages organizations, including creating new ones and viewing existing ones. | `src/features/admin/organizations/` |
| **CouponPanel**       | Manages coupons, including creating new ones and viewing existing ones.       | `src/features/admin/coupons/`       |
| **BulkImportPanel**   | Provides a UI for importing members from a CSV file.                          | `src/features/admin/bulk-import/`   |
| **MemberSearchPanel** | Allows admins to search for members by email or member number.                | `src/features/admin/members/`       |
| **MembersList**       | Displays a paginated list of all members.                                     | `src/features/admin/members/`       |
| **ExportsPanel**      | Allows admins to start and monitor CSV exports of member data.                | `src/features/admin/exports/`       |
| **CardKeysPanel**     | Manages the keys used for digital membership cards.                           | `src/features/admin/card-keys/`     |
| **MaintenancePanel**  | Provides access to one-off maintenance tasks, such as data backfills.         | `src/features/admin/maintenance/`   |
| **AuditLogsPanel**    | Displays a log of recent admin actions.                                       | `src/features/admin/audit/`         |

## Lazy Loading

All admin panels are lazily loaded in `src/pages/Admin.tsx` using `React.lazy` and `<Suspense>` to improve performance.
