# Ralph Wiggum - Long-running AI agent loop (PowerShell version for Windows)
# Usage: .\ralph.ps1 [max_iterations]

param(
    [int]$MaxIterations = 10
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PrdFile = Join-Path $ScriptDir "prd.json"
$ProgressFile = Join-Path $ScriptDir "progress.txt"
$ArchiveDir = Join-Path $ScriptDir "archive"
$LastBranchFile = Join-Path $ScriptDir ".last-branch"

# Check if jq is installed
try {
    $null = Get-Command jq -ErrorAction Stop
} catch {
    Write-Host "ERROR: jq is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "  Option 1: choco install jq" -ForegroundColor Yellow
    Write-Host "  Option 2: scoop install jq" -ForegroundColor Yellow
    Write-Host "  Option 3: Download from https://stedolan.github.io/jq/download/" -ForegroundColor Yellow
    exit 1
}

# Archive previous run if branch changed
if (Test-Path $PrdFile) {
    if (Test-Path $LastBranchFile) {
        $CurrentBranch = (Get-Content $PrdFile | jq -r '.branchName // empty')
        $LastBranch = Get-Content $LastBranchFile
        
        if ($CurrentBranch -and $LastBranch -and $CurrentBranch -ne $LastBranch) {
            # Archive the previous run
            $Date = Get-Date -Format "yyyy-MM-dd"
            $FolderName = $LastBranch -replace '^ralph/', ''
            $ArchiveFolder = Join-Path $ArchiveDir "$Date-$FolderName"
            
            Write-Host "Archiving previous run: $LastBranch"
            New-Item -ItemType Directory -Path $ArchiveFolder -Force | Out-Null
            if (Test-Path $PrdFile) { Copy-Item $PrdFile $ArchiveFolder\ }
            if (Test-Path $ProgressFile) { Copy-Item $ProgressFile $ArchiveFolder\ }
            Write-Host "   Archived to: $ArchiveFolder"
            
            # Reset progress file for new run
            @"
# Ralph Progress Log
Started: $(Get-Date)
---
"@ | Set-Content $ProgressFile
        }
    }
}

# Track current branch
if (Test-Path $PrdFile) {
    $CurrentBranch = (Get-Content $PrdFile | jq -r '.branchName // empty')
    if ($CurrentBranch) {
        $CurrentBranch | Set-Content $LastBranchFile
    }
}

# Initialize progress file if it doesn't exist
if (-not (Test-Path $ProgressFile)) {
    @"
# Ralph Progress Log
Started: $(Get-Date)
---
"@ | Set-Content $ProgressFile
}

Write-Host ""
Write-Host "Starting Ralph - Max iterations: $MaxIterations" -ForegroundColor Cyan

for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Ralph Iteration $i of $MaxIterations" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    # Read prompt.md and pipe to amp
    $PromptContent = Get-Content (Join-Path $ScriptDir "prompt.md") -Raw
    
    # Run amp with the ralph prompt
    try {
        $Output = $PromptContent | amp --dangerously-allow-all 2>&1 | Tee-Object -Variable AmpOutput
        
        # Check for completion signal
        if ($AmpOutput -match "<promise>COMPLETE</promise>") {
            Write-Host ""
            Write-Host "Ralph completed all tasks!" -ForegroundColor Green
            Write-Host "Completed at iteration $i of $MaxIterations" -ForegroundColor Green
            exit 0
        }
        
        Write-Host ""
        Write-Host "Iteration $i complete. Continuing..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Error in iteration $i : $_" -ForegroundColor Red
        Write-Host "Continuing to next iteration..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "Ralph reached max iterations ($MaxIterations) without completing all tasks." -ForegroundColor Yellow
Write-Host "Check $ProgressFile for status." -ForegroundColor Yellow
exit 1
