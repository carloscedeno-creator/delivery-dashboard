# Script para hacer commit y push del progreso
Write-Host "🔄 Checking git status..." -ForegroundColor Cyan
git status

Write-Host "`n📦 Adding all changes..." -ForegroundColor Cyan
git add .

Write-Host "`n💾 Committing changes..." -ForegroundColor Cyan
git commit -m "feat: Add 3 Amigos section with Team Allocation report and improve Team Capacity

- Added THREE_AMIGOS and TEAM_ALLOCATION modules to permissions
- Created TeamAllocation component (read-only report) for viewing team capacity by squad/sprint
- Enhanced TeamCapacity component to show all developers with checkboxes for sprint participation
- Added squad_sprint_developers table migration for tracking developer participation
- Updated RoleAccess component to include new modules
- Updated unit tests (RoleAccess, permissions) and E2E tests (dashboard)
- Fixed RLS policies to use app_users instead of users table
- Improved Team Capacity UX: developers table always visible, better loading states"

Write-Host "`n🚀 Pushing to remote..." -ForegroundColor Cyan
git push

Write-Host "`n✅ Done! Progress saved to git." -ForegroundColor Green

