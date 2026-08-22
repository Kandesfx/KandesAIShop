@echo off
REM scripts/fix-cf-default-behavior.bat
REM
REM Vấn đề: Default Cache Behavior của CF distribution E1Q8DEYAXGY3N9
REM   dùng legacy ForwardedValues chỉ forward 3 headers (Origin, Authorization, Host).
REM   Cookie header KHÔNG forward -> session cookie admin không tới backend -> 403.
REM
REM Sửa: chuyển sang managed policies
REM   - CachePolicy: CachingDisabled (4135ea2d-6df8-44a3-9f43-ebbe8e61720f)
REM   - OriginRequestPolicy: AllViewer (216adef6-5c7f-47e4-b989-44a06f0d9f04)
REM
REM Lưu ý: KHÔNG thay đổi Path patterns, không thêm behavior mới.
REM        Chỉ thay 3 trường: ForwardedValues, CachePolicyId, OriginRequestPolicyId.

setlocal enabledelayedexpansion

set DIST_ID=E1Q8DEYAXGY3N9
set TMPDIR=%LOCALAPPDATA%\Temp
set CF_JSON=%TMPDIR%\cf-main.json
set CF_PATCHED=%TMPDIR%\cf-main-patched.json
set CF_UPDATE=%TMPDIR%\cf-update.json

echo ^>^> Target distribution: %DIST_ID%

aws cloudfront get-distribution-config --id %DIST_ID% --output json > "%CF_JSON%"
if errorlevel 1 (
  echo !! Failed to get distribution config
  exit /b 1
)

for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-Content '%CF_JSON%' -Raw | ConvertFrom-Json).ETag"') do set ETAG=%%i
echo ^>^> ETag: %ETAG%

REM Patch: thay thế ForwardedValues bằng managed policies ở Default Cache Behavior
REM Đồng thời giữ nguyên mọi thứ khác (Path patterns, Methods, Origins, ...)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$j = Get-Content '%CF_JSON%' -Raw | ConvertFrom-Json;" ^
  "$d = $j.DistributionConfig;" ^
  "$b = $d.DefaultCacheBehavior;" ^
  "$b.PSObject.Properties.Remove('ForwardedValues');" ^
  "$b.PSObject.Properties.Remove('MinTTL');" ^
  "$b.PSObject.Properties.Remove('DefaultTTL');" ^
  "$b.PSObject.Properties.Remove('MaxTTL');" ^
  "$b | Add-Member -NotePropertyName 'CachePolicyId' -NotePropertyValue '4135ea2d-6df8-44a3-9f43-ebbe8e61720f' -Force;" ^
  "$b | Add-Member -NotePropertyName 'OriginRequestPolicyId' -NotePropertyValue '216adef6-5c7f-47e4-b989-44a06f0d9f04' -Force;" ^
  "$b | Add-Member -NotePropertyName 'ResponseHeadersPolicyId' -NotePropertyValue '' -Force;" ^
  "$j.DistributionConfig | ConvertTo-Json -Depth 40 | Set-Content '%CF_PATCHED%' -Encoding UTF8"

if errorlevel 1 (
  echo !! Failed to patch config
  exit /b 1
)

echo.
echo ^>^> Patched config saved
echo ^>^> Verifying patched DefaultBehavior:
powershell -NoProfile -Command ^
  "$p = Get-Content '%CF_PATCHED%' -Raw | ConvertFrom-Json;" ^
  "$b = $p.DefaultCacheBehavior;" ^
  "Write-Host ('  Methods: ' + ($b.AllowedMethods.Items -join ','));" ^
  "Write-Host ('  ViewerProtocolPolicy: ' + $b.ViewerProtocolPolicy);" ^
  "Write-Host ('  CachePolicyId: ' + $b.CachePolicyId);" ^
  "Write-Host ('  OriginRequestPolicyId: ' + $b.OriginRequestPolicyId);" ^
  "Write-Host ('  ForwardedValues still present? ' + ($null -ne $b.ForwardedValues))"

echo.
echo ^>^> Apply to CloudFront...
aws cloudfront update-distribution ^
  --id %DIST_ID% ^
  --if-match %ETAG% ^
  --distribution-config "file:///%CF_PATCHED%" ^
  --output json > "%CF_UPDATE%"

if errorlevel 1 (
  echo !! Update failed
  echo Last response:
  type "%CF_UPDATE%"
  exit /b 1
)

powershell -NoProfile -Command ^
  "$r = Get-Content '%CF_UPDATE%' -Raw | ConvertFrom-Json;" ^
  "Write-Host ('>> Done. New ETag: ' + $r.ETag);" ^
  "Write-Host ('>> Status: ' + $r.Distribution.Status)"

echo.
echo ^>^> CloudFront se deploy trong 1-3 phut.
echo ^>^> Sau do test upload anh tren UI, hoac:
echo   curl -X POST -F "files=@image.png" -H "Cookie: <admin_session>" https://kandes.shop/api/admin/media/upload

endlocal
