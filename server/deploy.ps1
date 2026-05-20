# Appointix Backend Hugging Face Deployment Script
# Run this from the "server" directory in a PowerShell terminal!

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " >>> Appointix: Deploying Backend to Hugging Face Spaces <<<" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

# Ensure we are inside server folder
$currentFolder = Split-Path -Leaf (Get-Location)
if ($currentFolder -ne "server") {
    Write-Host "[!] Error: Please run this script from inside the 'server' directory!" -ForegroundColor Red
    Write-Host "Current directory is: $(Get-Location)"
    Exit
}

# 1. Initialize git if not already present
if (-not (Test-Path .git)) {
    Write-Host "[+] Git repository not detected in server/. Initializing local repository..." -ForegroundColor Cyan
    git init
} else {
    Write-Host "[*] Local Git repository detected in server/." -ForegroundColor Cyan
}

# 2. Stage all backend files
Write-Host "[+] Staging backend files..." -ForegroundColor Cyan
git add .

# 3. Commit files
Write-Host "[+] Committing files..." -ForegroundColor Cyan
git commit -m "Deploy Appointix backend to Hugging Face Spaces" 2>$null

# 4. Ensure we are on the 'main' branch
git branch -M main

# 5. Remove existing origin if configured and re-add correct one
git remote remove origin 2>$null
Write-Host "[+] Setting Hugging Face Space repository remote..." -ForegroundColor Cyan
git remote add origin https://huggingface.co/spaces/FaizRasool01/kaamwala-backend

# 6. Instruct user on password/token details
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host " >>> READY TO DEPLOY <<<" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host " When prompted by git push:"
Write-Host "   Username: FaizRasool01" -ForegroundColor Green
Write-Host "   Password: [Use your Hugging Face WRITE Token]" -ForegroundColor Green
Write-Host ""
Write-Host " Hint: Don't have a WRITE Token? Generate one at:" -ForegroundColor Cyan
Write-Host "    -> https://huggingface.co/settings/tokens" -ForegroundColor Cyan
Write-Host "    (Make sure to select 'Write' role when generating!)" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press any key to start the deployment push..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "[+] Pushing backend code..." -ForegroundColor Green
git push -u origin main --force
