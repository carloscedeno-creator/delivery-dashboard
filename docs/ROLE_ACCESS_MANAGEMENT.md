# Role Access Management

## Overview

The Role Access Management feature allows administrators to configure which modules each role can access through an intuitive matrix interface. This provides fine-grained control over user permissions without requiring code changes.

## Features

- **Matrix-based Interface**: Visual grid showing all roles × modules
- **Bulk Operations**: Toggle all modules for a role, or all roles for a module
- **Real-time Preview**: See permission counts and changes before saving
- **Database Persistence**: Permissions are saved to Supabase and override defaults
- **Cache Management**: Changes take effect immediately after saving

## Setup

### 1. Run Database Migration

Execute the migration script to create the `role_permission_config` table:

```sql
-- Run this in Supabase SQL Editor
-- File: docs/supabase/12_create_role_permission_config.sql
```

This creates:
- `role_permission_config` table to store custom permissions
- RLS policies restricting access to admin users only
- Automatic timestamp updates

### 2. Access the Interface

1. Log in as a user with `admin` role
2. Navigate to **Admin** → **Role Access** in the sidebar
3. The permission matrix will load with current permissions

## How It Works

### Permission Matrix

The matrix displays:
- **Rows**: All available modules, grouped by category (Core, Metrics, PM, Admin)
- **Columns**: All available roles (Admin, PM, 3 Amigos, Stakeholder, Regular)
- **Cells**: Checkboxes indicating access (checked = has access)

### Categories

Modules are organized into categories:

- **Core**: Overall, Product Roadmap, Delivery Roadmap, Strata Mapping
- **Metrics**: KPIs, Software Engineering Benchmark
- **PM**: PM Section (group), Project Metrics, Developer Metrics, Team Capacity
- **Admin**: Admin Section (group), User Administration, Role Access

### Default Permissions

If no custom permissions are configured in the database, the system uses default permissions from `src/config/permissions.js`:

- **admin**: Full access to all modules
- **pm**: Access to PM section and metrics (no admin access)
- **3amigos**: Same as PM
- **stakeholder**: Read-only access to most modules (no admin access)
- **regular**: Limited access (Overview and KPIs only)

### Custom Permissions

When custom permissions are saved:
1. They override default permissions
2. They are stored in `role_permission_config` table
3. They are cached for 5 minutes for performance
4. Changes take effect immediately after saving

## Usage

### Granting Access

1. Click a checkbox in the matrix to grant access
2. The checkbox will turn colored (matching the role color)
3. The permission count for that role will update
4. Click "Save Changes" to persist

### Revoking Access

1. Click a checked checkbox to revoke access
2. The checkbox will turn gray
3. The permission count will decrease
4. Click "Save Changes" to persist

### Bulk Operations

- **Toggle All for Role**: Click a role column header to grant/revoke all modules for that role
- **Toggle All for Module**: Click "All" button in a module row to grant/revoke that module for all roles

### Resetting to Defaults

Click "Reset to Defaults" to restore default permissions from the code configuration. This will discard any unsaved changes.

## Technical Details

### Database Schema

```sql
CREATE TABLE role_permission_config (
  role TEXT PRIMARY KEY,
  modules TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Permission Loading

The system checks for custom permissions in this order:

1. **Cache** (5-minute TTL)
2. **Database** (`role_permission_config` table)
3. **Defaults** (`ROLE_PERMISSIONS` in `permissions.js`)

### Automatic Module Inclusion

Some modules automatically include sub-modules:

- **PM Section** → automatically includes Project Metrics, Developer Metrics, Team Capacity
- **Admin Section** → automatically includes User Administration, Role Access

This happens both for default and custom permissions.

### Cache Management

- Permissions are cached for 5 minutes
- Cache is cleared automatically after saving
- Use `clearPermissionsCache()` to manually clear cache

## Security

- Only users with `admin` role can access Role Access Management
- RLS policies prevent non-admin users from reading/writing permissions
- All changes are logged with timestamps
- Default permissions serve as fallback if database is unavailable

## Troubleshooting

### Table Doesn't Exist

If you see "Table role_permission_config does not exist":
1. Run the migration script: `docs/supabase/12_create_role_permission_config.sql`
2. Refresh the page

### Changes Not Reflecting

1. Ensure you clicked "Save Changes"
2. Check browser console for errors
3. Verify Supabase connection
4. Clear browser cache and reload

### Default Permissions Not Loading

- Check `src/config/permissions.js` for correct defaults
- Verify role names match exactly (case-sensitive)
- Check browser console for errors

## Best Practices

1. **Test Changes**: Make small changes and test before bulk modifications
2. **Document Customizations**: Note any custom permission changes
3. **Regular Reviews**: Periodically review permissions for security
4. **Backup Defaults**: Keep default permissions in code as fallback
5. **Use Groups**: Prefer granting access to group modules (PM, Admin) rather than individual sub-modules

## Examples

### Granting PM Access to Stakeholder Role

1. Find "PM Section" row
2. Click checkbox in "Stakeholder" column
3. Click "Save Changes"
4. Stakeholder users will now see PM section in sidebar

### Removing Admin Access from PM Role

1. Find "Admin Section" row
2. Click checked checkbox in "PM" column
3. Click "Save Changes"
4. PM users will no longer see Admin section

### Bulk Grant All Metrics to All Roles

1. Click "All" button for "KPIs" row
2. Click "All" button for "Software Engineering Benchmark" row
3. Click "Save Changes"
4. All roles now have access to metrics

