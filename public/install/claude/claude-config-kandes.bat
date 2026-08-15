@echo off
REM =============================================================================
REM  Kandes.shop - Claude Code Installer (Claude Code only)
REM  Platforms : Windows (CMD)
REM  Author    : Kandes.shop
REM =============================================================================
REM
REM  Usage:
REM    curl -fsSL https://kandes.shop/install/claude/claude-config-kandes.bat -o "%TEMP%\kandes-claude.bat" && "%TEMP%\kandes-claude.bat"
REM
REM  CMD doesn't have a safe JSON merge tool, so this installer writes a
REM  minimal settings.json. If you already have settings.json, please use
REM  the PowerShell installer instead:
REM    irm https://kandes.shop/install/claude/claude-config-kandes.ps1 | iex
REM
REM =============================================================================

setlocal enabledelayedexpansion

set "BASE_URL=https://api.kandes.shop"
set "SETTINGS_DIR=%USERPROFILE%\.claude"
set "SETTINGS_FILE=%SETTINGS_DIR%\settings.json"

echo.
echo ============================================================
echo    Kandes.shop - Claude Code Installer
echo    Base URL: %BASE_URL%
echo ============================================================
echo.

REM --- Ask for API key ---
set /p "API_KEY=Enter your Kandes API key (paste then Enter): "
if "%API_KEY%"=="" (
    echo [ERR] API Key cannot be empty.
    exit /b 1
)

REM --- Prepare directory ---
if not exist "%SETTINGS_DIR%" mkdir "%SETTINGS_DIR%"

REM --- Write settings.json (overwrite - CMD can't safely merge JSON) ---
REM A backup is preserved if a previous file exists.
if exist "%SETTINGS_FILE%" (
    echo [WARN] Existing settings.json found. Backing up to settings.json.bak
    copy /Y "%SETTINGS_FILE%" "%SETTINGS_FILE%.bak" >NUL
)

(
    echo {
    echo   "env": {
    echo     "ANTHROPIC_BASE_URL": "%BASE_URL%",
    echo     "ANTHROPIC_API_KEY": "%API_KEY%",
    echo     "ANTHROPIC_AUTH_TOKEN": "%API_KEY%",
    echo     "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
    echo   }
    echo }
) > "%SETTINGS_FILE%"

REM --- Verify ---
findstr /C:"%BASE_URL%" "%SETTINGS_FILE%" >NUL
if errorlevel 1 (
    echo [ERR] Verification failed: %SETTINGS_FILE%
    exit /b 1
)
findstr /C:"%API_KEY%" "%SETTINGS_FILE%" >NUL
if errorlevel 1 (
    echo [ERR] Verification failed: %SETTINGS_FILE%
    exit /b 1
)

echo.
echo [OK] settings.json saved: %SETTINGS_FILE%
echo.
echo Run 'claude' to get started.
echo Need help? https://kandes.shop/docs/api
echo.

endlocal
