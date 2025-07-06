@echo off
setlocal enabledelayedexpansion

REM Check command line arguments
set DB_ONLY=false
if "%1"=="--db-only" set DB_ONLY=true

if "%DB_ONLY%"=="true" (
    echo 🗄️  Starting Blood Sugar History Database Only...
) else (
    echo 🚀 Starting Blood Sugar History Development Environment...
)

REM Colors for output (Windows 10+ supports emoji)
set RED=❌
set GREEN=✅
set YELLOW=⚠️
set BLUE=🔍

REM Function to check if a port is in use
:check_port
set port=%1
netstat -an | findstr ":%port%.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo %RED% Port %port% is already in use
    exit /b 1
) else (
    echo %GREEN% Port %port% is available
    exit /b 0
)

REM Check prerequisites
echo %BLUE% Checking prerequisites...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED% Docker is not running. Please start Docker first.
    exit /b 1
)
echo %GREEN% Docker is running

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED% Node.js is not installed. Please install Node.js first.
    exit /b 1
)
echo %GREEN% Node.js found

REM Check if .NET is installed
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED% .NET SDK is not installed. Please install .NET SDK first.
    exit /b 1
)
echo %GREEN% .NET SDK found

REM Check ports and set flags for skipping services
set SKIP_DB=0
set SKIP_BACKEND=0
set SKIP_FRONTEND=0

echo %BLUE% Checking ports...

REM Check port 5432 (always needed for database)
call :check_port 5432
if %errorlevel% neq 0 (
    set SKIP_DB=1
    echo %YELLOW% Skipping database startup because port 5432 is in use.
)

REM Only check other ports if not in DB_ONLY mode
if "%DB_ONLY%"=="false" (
    REM Check port 3000
    call :check_port 3000
    if %errorlevel% neq 0 (
        set SKIP_FRONTEND=1
        echo %YELLOW% Skipping frontend startup because port 3000 is in use.
    )

    REM Check port 8080
    call :check_port 8080
    if %errorlevel% neq 0 (
        set SKIP_BACKEND=1
        echo %YELLOW% Skipping backend startup because port 8080 is in use.
    )
)

REM Start PostgreSQL
if %SKIP_DB%==0 (
    echo %BLUE% Starting PostgreSQL...
    docker ps -a --format "table {{.Names}}" | findstr "bloodsugar-postgres" >nul
    if %errorlevel% equ 0 (
        echo %YELLOW% PostgreSQL container exists, starting it...
        docker start bloodsugar-postgres
        set POSTGRES_CONTAINER=bloodsugar-postgres
    ) else (
        echo %YELLOW% Creating PostgreSQL container...
        docker run -d --name bloodsugar-postgres -e POSTGRES_DB=bloodsugar -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15
        set POSTGRES_CONTAINER=bloodsugar-postgres
    )
    echo %YELLOW% Waiting for PostgreSQL to be ready...
    :wait_for_postgres
    docker exec %POSTGRES_CONTAINER% pg_isready -U postgres >nul 2>&1
    if %errorlevel% neq 0 (
        echo -n .
        timeout /t 1 /nobreak >nul
        goto wait_for_postgres
    )
    echo.
    echo %GREEN% PostgreSQL is ready
) else (
    echo %YELLOW% Database will not be started due to port conflict.
)

REM Only start backend and frontend if not in DB_ONLY mode
if "%DB_ONLY%"=="false" (
    REM Start backend with hot reload
    echo Starting backend with hot reload...
    cd backend
    set DOTNET_ENVIRONMENT=Development
    start "backend" dotnet watch run
    cd ..

    REM Start frontend
    if %SKIP_FRONTEND%==0 (
        echo %BLUE% Starting frontend...
        cd frontend
        if not exist "node_modules" (
            echo %YELLOW% Installing frontend dependencies...
            npm install
        )
        echo %GREEN% Starting frontend on http://localhost:3000
        start /b npm start
        set FRONTEND_PID=%errorlevel%
        cd ..
    ) else (
        echo %YELLOW% Frontend will not be started due to port conflict.
    )
    echo %BLUE% Waiting for services to be ready...
    timeout /t 10 /nobreak >nul
) else (
    echo %GREEN% Database-only mode: Backend and frontend will not be started
)

REM Check if services are running
echo %BLUE% Checking service status...
if %SKIP_DB%==0 (
    docker exec %POSTGRES_CONTAINER% pg_isready -U postgres >nul 2>&1
    if %errorlevel% equ 0 (
        echo %GREEN% PostgreSQL is running on localhost:5432
    ) else (
        echo %RED% PostgreSQL is not responding
        goto cleanup
    )
)
if "%DB_ONLY%"=="false" (
    if %SKIP_BACKEND%==0 (
        curl -s http://localhost:8080/health >nul 2>&1
        if %errorlevel% equ 0 (
            echo %GREEN% Backend is running on http://localhost:8080
        ) else (
            echo %RED% Backend is not responding
            goto cleanup
        )
    )
    if %SKIP_FRONTEND%==0 (
        curl -s http://localhost:3000 >nul 2>&1
        if %errorlevel% equ 0 (
            echo %GREEN% Frontend is running on http://localhost:3000
        ) else (
            echo %YELLOW% Frontend is still starting up...
        )
    )
    echo.
    echo %GREEN% 🎉 Development environment is ready!
    echo.
    echo %BLUE% 🌐 Frontend: %GREEN%http://localhost:3000
    echo %BLUE% 🔧 Backend API: %GREEN%http://localhost:8080
    echo %BLUE% 🗄️  Database: %GREEN%localhost:5432
    echo %BLUE%    Database Name: %GREEN%bloodsugar
    echo %BLUE%    Username: %GREEN%postgres
    echo %BLUE%    Password: %GREEN%password
    echo.
    echo %YELLOW% 📝 Press Ctrl+C to stop all services
    echo.
    pause
) else (
    echo.
    echo %GREEN% 🎉 Database is ready!
    echo.
    echo %BLUE% 🗄️  Database: %GREEN%localhost:5432
    echo %BLUE%    Database Name: %GREEN%bloodsugar
    echo %BLUE%    Username: %GREEN%postgres
    echo %BLUE%    Password: %GREEN%password
    echo.
    echo %YELLOW% 📝 Press any key to stop database
    echo.
    pause
)

:cleanup
echo.
echo %YELLOW% 🛑 Stopping services...
if "%DB_ONLY%"=="false" (
    if defined FRONTEND_PID (
        taskkill /PID %FRONTEND_PID% /F >nul 2>&1
        echo %GREEN% Frontend stopped
    )
    if defined BACKEND_PID (
        taskkill /PID %BACKEND_PID% /F >nul 2>&1
        echo %GREEN% Backend stopped
    )
)
if defined POSTGRES_CONTAINER (
    docker stop %POSTGRES_CONTAINER% >nul 2>&1
    echo %GREEN% PostgreSQL stopped
)
exit /b 0 