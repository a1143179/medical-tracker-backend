@echo off
setlocal enabledelayedexpansion

REM Check command line arguments
set "DB_ONLY=false"
if "%1"=="--db-only" set "DB_ONLY=true"

if "%DB_ONLY%"=="true" (
    echo 🗄️  Starting Blood Sugar History Database Only...
) else (
    echo 🚀 Starting Blood Sugar History Development Environment...
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)
echo ✅ Docker is running

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check if .NET is installed
where dotnet >nul 2>&1
if errorlevel 1 (
    echo ❌ .NET SDK is not installed. Please install .NET SDK first.
    pause
    exit /b 1
)
echo ✅ .NET SDK found

REM Function to kill process on a port
:kill_process_on_port
set port=%1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%port%') do set pid=%%a
if defined pid (
    echo 🔍 Found process !pid! using port %port%
    set /p kill_choice="Do you want to kill this process? (y/N): "
    if /i "!kill_choice!"=="y" (
        echo 🛑 Killing process !pid!...
        taskkill /PID !pid! /F >nul 2>&1
        timeout /t 2 /nobreak >nul
        netstat -ano | findstr :%port% >nul
        if errorlevel 1 (
            echo ✅ Successfully freed port %port%
            goto :eof
        ) else (
            echo ❌ Failed to kill process on port %port%
            exit /b 1
        )
    ) else (
        echo ❌ Port %port% is still occupied. Exiting.
        exit /b 1
    )
) else (
    exit /b 1
)

REM Check if ports are available and offer to kill processes if needed
echo 🔍 Checking ports...

REM Check port 5432 (always needed for database)
netstat -an | findstr :5432 >nul
if not errorlevel 1 (
    echo ❌ Port 5432 is already in use
    call :kill_process_on_port 5432
    if errorlevel 1 (
        pause
        exit /b 1
    )
)
echo ✅ Port 5432 is available

REM Only check other ports if not in DB_ONLY mode
if "%DB_ONLY%"=="false" (
    REM Check port 3000
    netstat -an | findstr :3000 >nul
    if not errorlevel 1 (
        echo ❌ Port 3000 is already in use
        call :kill_process_on_port 3000
        if errorlevel 1 (
            pause
            exit /b 1
        )
    )
    echo ✅ Port 3000 is available

    REM Check port 8080
    netstat -an | findstr :8080 >nul
    if not errorlevel 1 (
        echo ❌ Port 8080 is already in use
        call :kill_process_on_port 8080
        if errorlevel 1 (
            pause
            exit /b 1
        )
    )
    echo ✅ Port 8080 is available
)

REM Function to cleanup on exit
:cleanup
if "%DB_ONLY%"=="false" (
    if defined FRONTEND_PID (
        taskkill /PID !FRONTEND_PID! /F >nul 2>&1
        echo ✅ Frontend stopped
    )
    if defined BACKEND_PID (
        taskkill /PID !BACKEND_PID! /F >nul 2>&1
        echo ✅ Backend stopped
    )
)
if defined POSTGRES_CONTAINER (
    docker stop !POSTGRES_CONTAINER! >nul 2>&1
    echo ✅ PostgreSQL stopped
)
exit /b 0

REM Start PostgreSQL
echo 🗄️  Starting PostgreSQL...

REM Check if PostgreSQL container already exists
docker ps -a --format "table {{.Names}}" | findstr "bloodsugar-postgres" >nul
if not errorlevel 1 (
    echo 📦 PostgreSQL container exists, starting it...
    docker start bloodsugar-postgres
    set POSTGRES_CONTAINER=bloodsugar-postgres
) else (
    echo 📦 Creating PostgreSQL container...
    docker run -d --name bloodsugar-postgres -e POSTGRES_DB=bloodsugar -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:15
    set POSTGRES_CONTAINER=bloodsugar-postgres
)

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
:wait_postgres
docker exec !POSTGRES_CONTAINER! pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    echo -n .
    timeout /t 1 /nobreak >nul
    goto wait_postgres
)
echo.
echo ✅ PostgreSQL is ready

REM Only start backend and frontend if not in DB_ONLY mode
if "%DB_ONLY%"=="false" (
    REM Start backend
    echo 🔧 Starting backend...
    cd backend

    REM Check if backend dependencies are installed
    if not exist "bin" (
        echo 📦 Restoring backend dependencies...
        dotnet restore
    )

    REM Start backend in background
    echo 🚀 Starting backend on http://localhost:8080
    start /B dotnet run
    set BACKEND_PID=%ERRORLEVEL%

    REM Wait a moment for backend to start
    timeout /t 5 /nobreak >nul

    REM Start frontend
    echo 🌐 Starting frontend...
    cd ..\frontend

    REM Check if frontend dependencies are installed
    if not exist "node_modules" (
        echo 📦 Installing frontend dependencies...
        npm install
    )

    REM Start frontend in background
    echo 🚀 Starting frontend on http://localhost:3000
    start /B npm start
    set FRONTEND_PID=%ERRORLEVEL%

    REM Wait for services to be ready
    echo ⏳ Waiting for services to be ready...
    timeout /t 10 /nobreak >nul
) else (
    echo ✅ Database-only mode: Backend and frontend will not be started
)

REM Check if services are running
echo 🔍 Checking service status...

REM Check PostgreSQL
docker exec !POSTGRES_CONTAINER! pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    echo ❌ PostgreSQL is not responding
    call :cleanup
) else (
    echo ✅ PostgreSQL is running on localhost:5432
)

REM Only check backend and frontend if not in DB_ONLY mode
if "%DB_ONLY%"=="false" (
    REM Check backend (basic check)
    curl -s http://localhost:8080/health >nul 2>&1
    if errorlevel 1 (
        echo ⏳ Backend is still starting up...
    ) else (
        echo ✅ Backend is running on http://localhost:8080
    )

    REM Check frontend (basic check)
    curl -s http://localhost:3000 >nul 2>&1
    if errorlevel 1 (
        echo ⏳ Frontend is still starting up...
    ) else (
        echo ✅ Frontend is running on http://localhost:3000
    )

    echo.
    echo 🎉 Development environment is ready!
    echo.
    echo 🌐 Frontend: http://localhost:3000
    echo 🔧 Backend API: http://localhost:8080
    echo 🗄️  Database: localhost:5432
    echo    Database Name: bloodsugar
    echo    Username: postgres
    echo    Password: password
    echo.
    echo 📝 Press any key to stop all services
    echo.
) else (
    echo.
    echo 🎉 Database is ready!
    echo.
    echo 🗄️  Database: localhost:5432
    echo    Database Name: bloodsugar
    echo    Username: postgres
    echo    Password: password
    echo.
    echo 📝 Press any key to stop database
    echo.
)

REM Wait for user input
pause >nul

REM Cleanup
call :cleanup 