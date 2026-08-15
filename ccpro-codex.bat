@echo off
REM Codex Config-Only Script (CMD / Windows)
REM Writes %USERPROFILE%\.codex\config.toml and auth.json.
REM Assumes Node.js and the `codex` CLI are already installed.
REM
REM Usage (always interactive - you will be prompted for your API key):
REM   curl -fsSL http://47.115.148.185/codex/codex-config-api.bat -o "%TEMP%\codex-config.bat" && "%TEMP%\codex-config.bat"

setlocal

set "BASE_URL=https://api.ccpro.cn/v1"
set "CODEX_DIR=%USERPROFILE%\.codex"
set "CONFIG_FILE=%CODEX_DIR%\config.toml"
set "AUTH_FILE=%CODEX_DIR%\auth.json"

echo.
echo ================================================
echo    Codex Proxy - Config-Only Installer
echo    Base URL: %BASE_URL%
echo ================================================
echo.

REM ---------- 1. Read API Key (always interactive) ----------
set "API_KEY="

:askkey
set /p "API_KEY=Enter your OpenAI API Key: "
if "%API_KEY%"=="" (
    echo [ERR]  API Key cannot be empty
    goto askkey
)

REM ---------- 2. Ensure config dir exists ----------
if not exist "%CODEX_DIR%" mkdir "%CODEX_DIR%"

REM ---------- 3. Write config.toml ----------
echo [INFO] Writing %CONFIG_FILE% ...
(
    echo model_provider = "JY"
    echo model = "gpt-5.4" #model = "gpt-5.3-codex"
    echo model_reasoning_effort = "high"
    echo disable_response_storage = true
    echo.
    echo.
    echo [model_providers.JY]
    echo name = "JY"
    echo base_url = "%BASE_URL%"
    echo wire_api = "responses"
    echo requires_openai_auth = true
) > "%CONFIG_FILE%"
if errorlevel 1 (
    echo [ERR]  Failed to write %CONFIG_FILE%
    goto fail
)
echo [OK]   config.toml saved

REM ---------- 4. Write auth.json ----------
echo [INFO] Writing %AUTH_FILE% ...
(
    echo {
    echo   "OPENAI_API_KEY": "%API_KEY%"
    echo }
) > "%AUTH_FILE%"
if errorlevel 1 (
    echo [ERR]  Failed to write %AUTH_FILE%
    goto fail
)
echo [OK]   auth.json saved

REM ---------- 5. Done ----------
set "KEY_PREVIEW=%API_KEY:~0,8%"
echo.
echo ================================================
echo    Setup Complete!
echo ================================================
echo.
echo   Base URL : %BASE_URL%
echo   API Key  : %KEY_PREVIEW%...
echo   Config   : %CONFIG_FILE%
echo   Auth     : %AUTH_FILE%
echo.
echo Run 'codex' to get started.
echo.

pause
endlocal
exit /b 0

:fail
echo.
pause
endlocal
exit /b 1
