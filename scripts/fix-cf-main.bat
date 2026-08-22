@echo off
REM scripts/fix-cf-main.bat
REM Bật POST cho path /api/* trên CloudFront distribution kandes.shop (main)
REM
REM Yêu cầu: AWS CLI đã config credentials có quyền CloudFront.
REM Chạy: scripts\fix-cf-main.bat

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

REM Lấy ETag
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-Content '%CF_JSON%' -Raw | ConvertFrom-Json).ETag"') do set ETAG=%%i
echo ^>^> ETag: %ETAG%

REM Lấy Origin ID đầu tiên
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Get-Content '%CF_JSON%' -Raw | ConvertFrom-Json).DistributionConfig.Origins.Items[0].Id"') do set ORIGIN_ID=%%i
echo ^>^> Origin ID: %ORIGIN_ID%

REM Patch bằng PowerShell + ConvertFrom-Json (cho an toàn trên Windows, không cần jq)
powershell -NoProfile -Command ^
  "$json = Get-Content '%CF_JSON%' -Raw | ConvertFrom-Json;" ^
  "$dc = $json.DistributionConfig;" ^
  "$existing = $dc.CacheBehaviors.Items | Where-Object { $_.PathPattern -eq '/api/*' };" ^
  "if ($existing) {" ^
  "  foreach ($b in $dc.CacheBehaviors.Items) {" ^
  "    if ($b.PathPattern -eq '/api/*') {" ^
  "      $b.AllowedMethods = @{ Quantity=7; Items=@('GET','HEAD','OPTIONS','PUT','POST','PATCH','DELETE'); CachedMethods=@{Quantity=0;Items=@()} };" ^
  "      $b.CachePolicyId = '4135ea2d-6df8-44a3-9f43-ebbe8e61720f';" ^
  "      $b.OriginRequestPolicyId = '216adef6-5c7f-47e4-b989-44a06f0d9f04';" ^
  "      $b.ViewerProtocolPolicy = 'redirect-to-https';" ^
  "    }" ^
  "  }" ^
  "} else {" ^
  "  $newBehavior = [ordered]@{" ^
  "    PathPattern='/api/*';" ^
  "    TargetOriginId='%ORIGIN_ID%';" ^
  "    ViewerProtocolPolicy='redirect-to-https';" ^
  "    AllowedMethods=@{ Quantity=7; Items=@('GET','HEAD','OPTIONS','PUT','POST','PATCH','DELETE'); CachedMethods=@{Quantity=0;Items=@()} };" ^
  "    CachePolicyId='4135ea2d-6df8-44a3-9f43-ebbe8e61720f';" ^
  "    OriginRequestPolicyId='216adef6-5c7f-47e4-b989-44a06f0d9f04';" ^
  "    SmoothStreaming=$false;" ^
  "    Compress=$true;" ^
  "    LambdaFunctionAssociations=@{Quantity=0};" ^
  "    FunctionAssociations=@{Quantity=0};" ^
  "    TrustedSigners=@{Enabled=$false;Quantity=0};" ^
  "    TrustedKeyGroups=@{Enabled=$false;Quantity=0};" ^
  "    FieldLevelEncryptionId='';" ^
  "    TTL=0;" ^
  "  };" ^
  "  $dc.CacheBehaviors.Items = @($dc.CacheBehaviors.Items) + @($newBehavior);" ^
  "}" ^
  "$dc.CacheBehaviors.Quantity = @($dc.CacheBehaviors.Items).Count;" ^
  "$json.DistributionConfig | ConvertTo-Json -Depth 30 | Set-Content '%CF_PATCHED%' -Encoding UTF8"

if errorlevel 1 (
  echo !! Failed to patch config
  exit /b 1
)

echo.
echo ^>^> Patched config: %CF_PATCHED%
echo ^>^> CacheBehaviors count:
powershell -NoProfile -Command "Write-Host ((Get-Content '%CF_PATCHED%' -Raw | ConvertFrom-Json).CacheBehaviors.Items | Measure-Object).Count"
powershell -NoProfile -Command "(Get-Content '%CF_PATCHED%' -Raw | ConvertFrom-Json).CacheBehaviors.Items | ForEach-Object { Write-Host ('  Path: ' + $_.PathPattern + ' Methods: ' + ($_.AllowedMethods.Items -join ',')) }"

echo.
echo ^>^> Apply to CloudFront...
aws cloudfront update-distribution --id %DIST_ID% --if-match %ETAG% --distribution-config "file:///%CF_PATCHED%" --output json > "%CF_UPDATE%"
if errorlevel 1 (
  echo !! Update failed
  exit /b 1
)

powershell -NoProfile -Command ^
  "$r = Get-Content '%CF_UPDATE%' -Raw | ConvertFrom-Json;" ^
  "Write-Host ('>> Done. New ETag: ' + $r.ETag);" ^
  "Write-Host ('>> Status: ' + $r.Distribution.Status)"

echo.
echo ^>^> Đợi 1-3 phút để CloudFront deploy xong.
echo ^>^> Sau đó test: curl -X POST -F "files=@image.png" https://kandes.shop/api/admin/media/upload

endlocal
