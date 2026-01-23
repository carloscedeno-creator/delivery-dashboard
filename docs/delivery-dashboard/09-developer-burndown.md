# Developer Burndown (PM)

## Purpose
Show burndown progress by developer using the same sprint filters as other PM views, with historical assignee when available.

## Data Sources
- `sprints`: sprint metadata (`start_date`, `end_date`, `complete_date`, `state`)
- `issues`: active sprint issues via `current_sprint`
- `issue_sprints`: closed sprint snapshot (`status_at_sprint_close`, `story_points_at_close`)
- `issue_history`: status changes (and assignee changes when available)
- `initiatives`: project list for filtering (`initiative_name`, `initiative_key`)

## Calculation Rules
- **Active sprint**: filter issues using `issues.current_sprint = sprint_name` (do not use `issue_sprints`).
- **Closed sprint**: use `issue_sprints` snapshot for the sprint (`status_at_sprint_close`, `story_points_at_close`).
- **Completion status**: always use `statusHelper.isCompletedStatusSync()` (no hardcoded status).
- **Story points**:
  - Closed sprint: `story_points_at_close`
  - Active sprint: `current_story_points`
- **Historical assignee**: if `issue_history` includes `field_name = 'assignee'`, the assignee at each date is used to scope the burndown by developer.
  - If assignee history is missing, fallback to `issues.assignee_id` (current assignee).

## Filters
- **Sprint**: required (active or closed)
- **Developer**: required
- **Project**: optional, uses `initiatives` for selection (`initiative_id` on issues)
- **Squad**: optional (limits initiatives/issues to the squad)

## Burndown Output
For each day in the sprint range:
- `planned`: total SP for issues assigned to the developer on that day
- `completed`: total SP completed by that day
- `remaining`: `planned - completed`
- `completedTickets` and `totalTickets` for context

## Notes
- Planned SP can change across days if assignee changes during the sprint.
- If assignee history is unavailable, results reflect current assignment only.
