@echo off
rem ============================================================================
rem  Kandes.shop - Config Installer (Codex only)
rem  Platforms : Windows (Command Prompt / CMD)
rem  Author    : Kandes.shop
rem  Repo      : https://kandes.shop
rem
rem  Usage (one-line):
rem    curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.bat -o "%TEMP%\codex-config-kandes.bat" ^&^& "%TEMP%\codex-config-kandes.bat"
rem
rem  Note: For Claude Code support, please use the PowerShell version:
rem    irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex
rem ============================================================================

setlocal EnableExtensions EnableDelayedExpansion

set "KANDES_BASE_URL=https://api.kandes.shop/v1"
set "KANDES_BRAND=Kandes.shop"
set "SCRIPT_VERSION=1.1.0"

rem ---------------------------------------------------------------------------
rem  Banner
rem ---------------------------------------------------------------------------
echo.
echo  ============================================================================
echo.
echo     _  ___                    _    ___  _    _
echo    ^| ^|/ / ^|                  ^| ^|  / _ \^| ^|  (_)
echo    ^|   /^| ^|__   __ _ _ __ ___^| ^|_^| ^| ^| ^| ^|__ _ _ __
echo    ^|  ^< ^| '_ \ / _` ^| '__/ _ \ __^| ^| ^| ^| '_ \^| ^| '_ \
echo    ^|  . \^| ^| ^| ^| (_^| ^| ^| ^|  __/ ^|_^| ^|_^| ^| ^| ^| ^| ^| ^| ^| ^|
echo    ^|_^|\_\_^| ^|_^|\__,_^|_^|  \___^|\__^|\___/^|_^| ^|_^|^|_^| ^|_^|_^|
echo.
echo                  Interactive Config Installer  v%SCRIPT_VERSION%
echo.
echo  ============================================================================
echo.

rem ---------------------------------------------------------------------------
rem  Menu
rem ---------------------------------------------------------------------------
:menu
echo Which tool do you want to configure?
echo   1^) Codex CLI only
echo   2^) Claude Code only ^(PowerShell recommended^)
echo   3^) Both Codex and Claude Code ^(PowerShell recommended^)
echo   4^) Cancel
echo.
set "CHOICE="
set /p "CHOICE=Choose [1-4]: "
if "%CHOICE%"=="1" set "TOOLS=codex" & goto :after_menu
if "%CHOICE%"=="2" goto :needs_powershell
if "%CHOICE%"=="3" goto :needs_powershell
if "%CHOICE%"=="4" (
    echo.
    echo [WARN] Cancelled by user
    goto :end
)
echo [WARN] Invalid choice: "%CHOICE%"
echo.
goto :menu

:after_menu

rem ---------------------------------------------------------------------------
rem  Ask user to use PowerShell for Claude
rem ---------------------------------------------------------------------------
:needs_powershell
echo.
echo [INFO] Claude Code configuration requires JSON parsing that CMD cannot do safely.
echo [INFO] Please use the PowerShell version instead:
echo        irm https://kandes.shop/install/codex/codex-config-kandes.ps1 ^| iex
echo.
pause
goto :end

rem ---------------------------------------------------------------------------
rem  API key prompt
rem ---------------------------------------------------------------------------
:prompt_key
echo.
echo --- API key ---
echo Enter your Kandes API key (paste then press Enter^).
echo Find it in your dashboard: https://kandes.shop/account
echo.
set "API_KEY="
set /p "API_KEY=API Key: "
if "%API_KEY%"=="" (
    echo [ERR] API Key cannot be empty
    goto :prompt_key
)

rem ---------------------------------------------------------------------------
rem  Write Codex files
rem ---------------------------------------------------------------------------
:write_codex
set "CODEX_DIR=%USERPROFILE%\.codex"
set "CONFIG_FILE=%CODEX_DIR%\config.toml"
set "AUTH_FILE=%CODEX_DIR%\auth.json"

if not exist "%CODEX_DIR%" mkdir "%CODEX_DIR%" >nul 2>&1
if errorlevel 1 (
    echo [ERR] Cannot create %CODEX_DIR%
    goto :end_fail
)

echo.
echo --- Writing Codex config ---

(
    echo model_provider = "KANDES"
    echo model = "gpt-5.4"
    echo model_reasoning_effort = "high"
    echo disable_response_storage = true
    echo.
    echo [model_providers.KANDES]
    echo name = "KANDES"
    echo base_url = "%KANDES_BASE_URL%"
    echo wire_api = "responses"
    echo env_key = "OPENAI_API_KEY"
) > "%CONFIG_FILE%"

if exist "%CONFIG_FILE%" (
    echo [OK] config.toml saved: %CONFIG_FILE%
) else (
    echo [ERR] Failed to write config.toml
    goto :end_fail
)

rem auth.json — minimal JSON
(
    echo {
    echo   "OPENAI_API_KEY": "%API_KEY%"
    echo }
) > "%AUTH_FILE%"

findstr /c:"OPENAI_API_KEY" "%AUTH_FILE%" >nul
if not errorlevel 1 (
    echo [OK] auth.json saved: %AUTH_FILE%
) else (
    echo [ERR] Failed to write auth.json
    goto :end_fail
)

rem ---------------------------------------------------------------------------
rem  Summary
rem ---------------------------------------------------------------------------
echo.
echo --- Setup Complete ---
echo.
set "KEY_PREVIEW=%API_KEY:~0,8%..."
echo   Installed for : Codex CLI
echo   Base URL      : %KANDES_BASE_URL%
echo   API Key       : !KEY_PREVIEW!
echo.
echo Run 'codex' to get started.
echo Need help? https://kandes.shop/docs/api
echo.
goto :end

:end_fail
echo.
echo [ERR] Installation failed.
echo Please report at https://kandes.shop/help/contact

:end
endlocal