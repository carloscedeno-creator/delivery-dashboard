# Sprint Filters and Missing Tickets Fix

## Context
Users saw duplicate sprints in the dropdown (e.g., "Sprint 13" and "OBD Sprint 13") and
some sprints showed zero tickets even when Jira had active work. This document
records the root cause and the corrective actions.

## Root Cause
1. Manual inserts created sprints with prefixed names ("OBD Sprint X") that do not
   exist in Jira. Jira uses "Sprint X" for OBD and "ODSO Sprint X" for Core.
2. The UI filters are based on `sprints.sprint_name` and `squad_id`. Duplicate
   names caused ambiguous dropdown options and sprints without tickets.
3. The current sprint tickets live in `issue_sprints` and are created only when
   the sprint name matches Jira exactly.

## Fix Applied
1. Removed manually created sprints with names "OBD Sprint 4" through
   "OBD Sprint 14" to remove duplicates.
2. Forced a sync of issues in the active sprint for ODSO and OBD using Jira
   open sprint JQL to repopulate `issue_sprints`.
3. Updated sprint states for OBD and ODSO to reflect the current sprint:
   - OBD: "Sprint 14" set to `active`, "Sprint 13" set to `closed`
   - ODSO: "ODSO Sprint 14" set to `active`, "ODSO Sprint 13" set to `closed`

## Verification (Supabase)
- ODSO Sprint 14 now has tickets in `issue_sprints`.
- OBD Sprint 14 now has tickets in `issue_sprints`.
- Duplicate "OBD Sprint X" entries were removed from `sprints`.

## Notes
- Do NOT create sprints manually with made-up names or prefixes.
- Always use Jira sprint names as-is and ensure `squad_id` is correct.
- If the UI shows a sprint with no tickets, validate `issue_sprints` for that
  sprint ID and re-sync the current sprint issues.
