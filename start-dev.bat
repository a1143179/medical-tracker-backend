@echo off
setlocal enabledelayedexpansion

REM Initialize service flags
set "RUN_BACKEND=false"

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :after_parse_args
if "%~1"=="--backend" set "RUN_BACKEND=true"
shift
goto :parse_args

goto :after_parse_args

:after_parse_args
REM If no arguments provided, start all services
if "%RUN_BACKEND%"=="false" (
  set "RUN_BACKEND=true"
)



REM Display what services will be started
set "START_MSG=Starting: "
if "%RUN_BACKEND%"=="true" set "START_MSG=!START_MSG!Backend "
echo !START_MSG!


if "%RUN_BACKEND%"=="true" (
  where dotnet >nul 2>&1
  if %errorlevel% neq 0 (
    echo .NET SDK is not installed. Please install .NET SDK first.
    exit /b 1
  )
)

echo Checking ports...

echo Checking ports...

REM Track status for summary
set "BACKEND_STATUS="



REM Start backend (port 55556)
if "%RUN_BACKEND%"=="true" (
  echo Checking port 55556...
  set "SKIP_BACKEND="
  for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":55556 " ^| findstr LISTENING') do (
    set "SKIP_BACKEND=1"
    set "BACKEND_STATUS=SKIPPED (port 55556 in use)"
    goto :backend_skip
  )
  set "BACKEND_STATUS=STARTING"
  dotnet restore backend.csproj && dotnet watch run --project backend.csproj
  timeout /t 5 /nobreak >nul
  set "BACKEND_STATUS=RUNNING (http://localhost:55556)"
  goto :backend_done
)
:backend_skip
:backend_done



echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo Checking service status...

REM Check backend
if "%RUN_BACKEND%"=="true" (
  if defined SKIP_BACKEND (
    set "BACKEND_STATUS=SKIPPED (port 55556 in use)"
  ) else (
    curl -s http://localhost:55556/api/health >nul 2>&1
    if %errorlevel% equ 0 (
      set "BACKEND_STATUS=RUNNING (http://localhost:55556)"
    ) else (
      set "BACKEND_STATUS=NOT RESPONDING"
    )
  )
)



echo.
echo Services started successfully!
echo.

REM Print status for each service
if "%RUN_BACKEND%"=="true" echo Backend: !BACKEND_STATUS!

echo.
REM Print summary block only once
if "%RUN_BACKEND%"=="true" (
  echo Backend API: http://localhost:55556/api
)

echo.
echo Press Ctrl+C to stop backend service
echo.
pause 