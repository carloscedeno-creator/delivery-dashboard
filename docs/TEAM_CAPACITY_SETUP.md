# Team Capacity Setup Guide

## Overview

The Team Capacity feature allows PMs, admins, and 3amigos to configure and track capacity goals and actual capacity for squads by sprint. The system automatically calculates SP Done based on issues that reached "Done" or "Development Done" status during the sprint.

## Database Structure

### Table: `squad_sprint_capacity`

Stores capacity configuration for each squad-sprint combination:

- **id**: UUID primary key
- **squad_id**: Reference to squads table
- **sprint_id**: Reference to sprints table
- **capacity_goal_sp**: Planned story points for the sprint (from planning)
- **capacity_available_sp**: Actual available story points (considering time off, etc.)
- **sp_done**: **GENERATED COLUMN** - Automatically calculated SP from issues that reached Done during sprint
- **created_at**, **updated_at**: Timestamps
- **created_by_id**, **updated_by_id**: User references

### Unique Constraint

`(squad_id, sprint_id)` - One capacity record per squad-sprint combination

## SP Done Calculation

The `sp_done` column is automatically calculated using a GENERATED ALWAYS AS expression that:

1. **Finds issues** in the sprint for the squad
2. **Checks if issue reached Done** during sprint dates using:
   - `resolved_date` within sprint date range AND status is "Done" or "Development Done"
   - OR `status_by_sprint` JSONB shows "Done" status for this sprint
3. **Sums story points** from all matching issues

### Done Status Values

The system recognizes these statuses as "Done":
- `done`
- `development done`
- `resolved`
- `closed`
- `finished`

## Setup Instructions

### 1. Run Database Migration

Execute the migration script in Supabase SQL Editor:

```sql
-- File: docs/supabase/13_create_squad_sprint_capacity.sql
```

This creates:
- `squad_sprint_capacity` table
- Indexes for performance
- Trigger for `updated_at` timestamp
- Function `calculate_squad_sprint_sp_done()` for manual recalculation
- Function `recalculate_all_sp_done()` for batch updates
- View `v_squad_sprint_capacity_complete` with calculated metrics
- RLS policies (admin/pm/3amigos can manage, authenticated users can read)

### 2. Access the Interface

1. Log in as user with `admin`, `pm`, or `3amigos` role
2. Navigate to **PM** → **Team Capacity** in the sidebar
3. Select a sprint from the dropdown
4. View or configure capacity for each squad

## Usage

### Adding Capacity Data

1. Select a sprint from the dropdown
2. Scroll to "Add Capacity for Squad" section
3. Select a squad
4. Enter:
   - **Goal SP**: Planned story points from sprint planning
   - **Available SP**: Actual available capacity (considering time off, etc.)
5. Click "Add Capacity"

### Editing Capacity Data

1. Find the squad row in the table
2. Click the **Edit** button (pencil icon)
3. Modify Goal SP or Available SP
4. Click **Save** (checkmark) or **Cancel** (X)

### Recalculating SP Done

SP Done is automatically calculated, but you can manually trigger recalculation:

1. Click the **Refresh** button (circular arrow) next to a squad
2. The system will recalculate SP Done based on current issue data

## Calculated Metrics

The view `v_squad_sprint_capacity_complete` provides:

- **completion_percentage**: (SP Done / Capacity Goal SP) × 100
- **utilization_percentage**: (SP Done / Capacity Available SP) × 100
- **remaining_sp**: Capacity Goal SP - SP Done

## Color Coding

### Completion Percentage
- **Green (≥100%)**: Goal achieved or exceeded
- **Blue (80-99%)**: Close to goal
- **Amber (50-79%)**: Moderate progress
- **Red (<50%)**: Below target

### Utilization Percentage
- **Green (<90%)**: Healthy utilization
- **Amber (90-99%)**: High utilization
- **Red (≥100%)**: Over-utilization (potential burnout)

## Functions

### `calculate_squad_sprint_sp_done(squad_id, sprint_id)`

Manually calculate SP Done for a specific squad-sprint combination.

```sql
SELECT calculate_squad_sprint_sp_done('squad-uuid', 'sprint-uuid');
```

### `recalculate_all_sp_done()`

Recalculate SP Done for all capacity records (useful after data sync).

```sql
SELECT recalculate_all_sp_done();
```

## View: `v_squad_sprint_capacity_complete`

Complete view with all related data:

```sql
SELECT * FROM v_squad_sprint_capacity_complete
WHERE sprint_id = 'sprint-uuid'
ORDER BY squad_name;
```

Returns:
- Squad and sprint information
- Capacity goals and actuals
- Calculated metrics (completion %, utilization %)
- Creator and updater information

## Integration with Capacity Accuracy KPI

The Team Capacity data is used by the Capacity Accuracy KPI calculation:

- **Planned Capacity**: Uses `capacity_goal_sp` or `capacity_available_sp` from `squad_sprint_capacity`
- **Actual Capacity**: Uses `sp_done` (calculated) or `workload_sp` from `developer_sprint_metrics`

## Best Practices

1. **Set Capacity Before Sprint Starts**: Configure capacity goals during sprint planning
2. **Update Available Capacity**: Adjust if team members have time off
3. **Review SP Done Regularly**: Check that calculated SP Done matches expectations
4. **Use Completion %**: Monitor progress toward goal
5. **Watch Utilization %**: Ensure team isn't over-utilized (burnout risk)

## Troubleshooting

### SP Done is 0 but issues are Done

1. Verify issues are linked to the sprint (`issue_sprints` table)
2. Check `resolved_date` is within sprint date range
3. Verify issue status is recognized as "Done" (see status values above)
4. Check `status_by_sprint` JSONB if using historical tracking

### Cannot Save Capacity

1. Verify you have `admin`, `pm`, or `3amigos` role
2. Check RLS policies are correctly configured
3. Verify squad and sprint IDs are valid

### SP Done Not Updating

1. SP Done is a GENERATED column - it updates automatically when:
   - Issue status changes
   - Issue is linked/unlinked from sprint
   - Sprint dates change
2. Use `recalculate_all_sp_done()` function if needed
3. Check that issues have correct `story_points` values

## Related Tables

- `squads`: Squad information
- `sprints`: Sprint information (dates, state)
- `issues`: Issue data (story points, status)
- `issue_sprints`: Links issues to sprints
- `developer_sprint_metrics`: Developer-level metrics

