$ErrorActionPreference = "Stop"

$root = "C:\NEXUS\nexus-production"
Set-Location $root

Write-Host ""
Write-Host "NEXUS ALLIANCE - OWNER BREAK-GLASS 2FA RECOVERY" -ForegroundColor Magenta
Write-Host ""
Write-Host "This procedure RE-ENROLLS OWNER 2FA from the server." -ForegroundColor Yellow
Write-Host "It does not create an unprotected OWNER session." -ForegroundColor Yellow
Write-Host ""

$email = Read-Host "OWNER email"
$passwordSecure = Read-Host "OWNER current password" -AsSecureString
$recoverySecure = Read-Host "OWNER break-glass secret" -AsSecureString

$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
$secretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($recoverySecure)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
    $recoverySecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPtr)

    $env:NEXUS_RECOVERY_INPUT_EMAIL = $email
    $env:NEXUS_RECOVERY_INPUT_PASSWORD = $password
    $env:NEXUS_RECOVERY_INPUT_SECRET = $recoverySecret

    Write-Host ""
    Write-Host "Verifying OWNER identity and preparing replacement authenticator..." -ForegroundColor Cyan

    & node.exe "scripts\nexus-owner-breakglass.cjs" begin

    if ($LASTEXITCODE -ne 0) {
        throw "Break-glass begin stage failed."
    }

    Write-Host ""
    Write-Host "Open this QR on the machine:" -ForegroundColor Cyan
    Write-Host "  C:\NEXUS\OWNER-2FA-RECOVERY-QR.png" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Scan it with your authenticator app." -ForegroundColor Yellow
    Write-Host "Your OLD authenticator still works until you successfully confirm the new one." -ForegroundColor Yellow
    Write-Host ""

    $code = Read-Host "Enter the NEW 6-digit authenticator code"

    if ($code -notmatch '^\d{6}$') {
        throw "A 6-digit code is required."
    }

    $env:NEXUS_RECOVERY_TOTP_CODE = $code

    Write-Host ""
    Write-Host "Confirming replacement factor..." -ForegroundColor Cyan

    & node.exe "scripts\nexus-owner-breakglass.cjs" confirm

    if ($LASTEXITCODE -ne 0) {
        throw "Break-glass confirmation failed. The old factor remains active."
    }

    Write-Host ""
    Write-Host "SUCCESS." -ForegroundColor Green
    Write-Host "New OWNER 2FA is active." -ForegroundColor Green
    Write-Host ""
    Write-Host "New one-time recovery codes were written to:" -ForegroundColor Cyan
    Write-Host "  C:\NEXUS\OWNER-2FA-RECOVERY-CODES-ONCE.txt" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Move them into your password manager and DELETE that file." -ForegroundColor Yellow
}
finally {
    if ($passwordPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }

    if ($secretPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPtr)
    }

    Remove-Item Env:\NEXUS_RECOVERY_INPUT_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:\NEXUS_RECOVERY_INPUT_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\NEXUS_RECOVERY_INPUT_SECRET -ErrorAction SilentlyContinue
    Remove-Item Env:\NEXUS_RECOVERY_TOTP_CODE -ErrorAction SilentlyContinue
}
