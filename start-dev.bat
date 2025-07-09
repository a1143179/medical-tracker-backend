@echo off
setlocal enabledelayedexpansion

REM Check command line arguments
set DB_ONLY=false
set BACKEND_ONLY=false
set FRONTEND_ONLY=false
set FULL_START=false

if "%1"=="--db" (
    set DB_ONLY=true
    echo 🗄️  Starting Blood Sugar History Database Only...
) else if "%1"=="--backend" (
    set BACKEND_ONLY=true
    echo 🔧 Starting Blood Sugar History Backend Only...
) else if "%1"=="--frontend" (
    set FRONTEND_ONLY=true
    echo 🌐 Building Blood Sugar History Frontend Only...
) else (
    set FULL_START=true
    echo 🚀 Starting Blood Sugar History Full Development Environment...
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

REM Check ports based on mode
if "%FULL_START%"=="true" (
    REM Full start mode - check port 3000 (backend + frontend)
    call :check_port 3000
    if %errorlevel% neq 0 (
        set SKIP_BACKEND=1
        set SKIP_FRONTEND=1
        echo %YELLOW% Skipping backend and frontend startup because port 3000 is in use.
    )
) else if "%BACKEND_ONLY%"=="true" (
    REM Backend only mode - check port 3000
    call :check_port 3000
    if %errorlevel% neq 0 (
        set SKIP_BACKEND=1
        echo %YELLOW% Skipping backend startup because port 3000 is in use.
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

REM Start services based on mode
if "%FULL_START%"=="true" (
    REM Full start mode - start backend and build frontend
    if %SKIP_BACKEND%==0 (
        echo %BLUE% Starting backend with hot reload...
        cd backend
        set DOTNET_ENVIRONMENT=Development
        start "backend" dotnet watch run
        cd ..
    )

    REM Build frontend for production
    if %SKIP_FRONTEND%==0 (
        echo %BLUE% Building frontend...
        cd frontend
        if not exist "node_modules" (
            echo %YELLOW% Installing frontend dependencies...
            npm install
        )
        echo %GREEN% Building frontend for production...
        npm run build
        
        echo %GREEN% Copying frontend build to backend...
        if exist "..\backend\build" rmdir /s /q "..\backend\build"
        xcopy /e /i build "..\backend\build"
        
        cd ..
    ) else (
        echo %YELLOW% Frontend will not be built due to port conflict.
    )
    echo %BLUE% Waiting for services to be ready...
    timeout /t 10 /nobreak >nul

) else if "%BACKEND_ONLY%"=="true" (
    REM Backend only mode
    if %SKIP_BACKEND%==0 (
        echo %BLUE% Starting backend with hot reload...
        cd backend
        set DOTNET_ENVIRONMENT=Development
        start "backend" dotnet watch run
        cd ..
    )

) else if "%FRONTEND_ONLY%"=="true" (
    REM Frontend only mode - just build and copy
    echo %BLUE% Building frontend...
    cd frontend
    if not exist "node_modules" (
        echo %YELLOW% Installing frontend dependencies...
        npm install
    )
    echo %GREEN% Building frontend for production...
    npm run build
    
    echo %GREEN% Copying frontend build to backend...
    if exist "..\backend\build" rmdir /s /q "..\backend\build"
    xcopy /e /i build "..\backend\build"
    
    cd ..
    echo %GREEN% ✅ Frontend build completed and copied to backend
    echo.
    echo %BLUE% 📁 Build files copied to: %GREEN%backend\build\
    echo.
    pause
    exit /b 0

) else if "%DB_ONLY%"=="true" (
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
REM Check service status based on mode
if "%FULL_START%"=="true" (
    REM Full start mode - check both backend and frontend
    if %SKIP_BACKEND%==0 (
        curl -s http://localhost:3000/health >nul 2>&1
        if %errorlevel% equ 0 (
            echo %GREEN% Backend is running on http://localhost:3000
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
    echo %GREEN% 🎉 Full development environment is ready!
    echo.
    echo %BLUE% 🌐 Application: %GREEN%http://localhost:3000
    echo %BLUE% 🔧 Backend API: %GREEN%http://localhost:3000/api
    echo %BLUE% 🗄️  Database: %GREEN%localhost:5432
    echo %BLUE%    Database Name: %GREEN%bloodsugar
    echo %BLUE%    Username: %GREEN%postgres
    echo %BLUE%    Password: %GREEN%password
    echo.
    echo %YELLOW% 📝 Press Ctrl+C to stop all services
    echo.
    pause

) else if "%BACKEND_ONLY%"=="true" (
    REM Backend only mode - check only backend
    if %SKIP_BACKEND%==0 (
        curl -s http://localhost:3000/health >nul 2>&1
        if %errorlevel% equ 0 (
            echo %GREEN% Backend is running on http://localhost:3000
        ) else (
            echo %RED% Backend is not responding
            goto cleanup
        )
    )
    echo.
    echo %GREEN% 🎉 Backend is ready!
    echo.
    echo %BLUE% 🔧 Backend API: %GREEN%http://localhost:3000/api
    echo %BLUE% 🗄️  Database: %GREEN%localhost:5432
    echo %BLUE%    Database Name: %GREEN%bloodsugar
    echo %BLUE%    Username: %GREEN%postgres
    echo %BLUE%    Password: %GREEN%password
    echo.
    echo %YELLOW% 📝 Press Ctrl+C to stop backend
    echo.
    pause

) else if "%FRONTEND_ONLY%"=="true" (
    REM Frontend only mode - already completed
    echo.
    echo %GREEN% 🎉 Frontend build completed!
    echo.
    echo %BLUE% 📁 Build files copied to: %GREEN%backend\build\
    echo.
    pause
    exit /b 0

) else if "%DB_ONLY%"=="true" (
    REM Database only mode
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
if "%FULL_START%"=="true" (
    REM Full start mode cleanup
    if defined FRONTEND_PID (
        taskkill /PID %FRONTEND_PID% /F >nul 2>&1
        echo %GREEN% Frontend stopped
    )
    if defined BACKEND_PID (
        taskkill /PID %BACKEND_PID% /F >nul 2>&1
        echo %GREEN% Backend stopped
    )
) else if "%BACKEND_ONLY%"=="true" (
    REM Backend only mode cleanup
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