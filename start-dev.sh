#!/bin/bash

# Check command line arguments
DB_ONLY=false
if [ "$1" = "--db-only" ]; then
    DB_ONLY=true
fi

if [ "$DB_ONLY" = true ]; then
    echo "🗄️  Starting Blood Sugar History Database Only..."
else
    echo "🚀 Starting Blood Sugar History Development Environment..."
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use (Windows-compatible)
check_port() {
    local port=$1
    if netstat -an | grep -q ":$port.*LISTENING"; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if Docker is running
check_docker

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found${NC}"

# Check if .NET is installed
if ! command_exists dotnet; then
    echo -e "${RED}❌ .NET SDK is not installed. Please install .NET SDK first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .NET SDK found${NC}"

# Check ports and set flags for skipping services
SKIP_DB=0
SKIP_BACKEND=0
SKIP_FRONTEND=0

echo -e "${BLUE}🔍 Checking ports...${NC}"

# Check port 5432 (always needed for database)
if ! check_port 5432; then
    SKIP_DB=1
    echo -e "${YELLOW}⚠️  Skipping database startup because port 5432 is in use.${NC}"
fi

# Only check other ports if not in DB_ONLY mode
if [ "$DB_ONLY" = false ]; then
    # Check port 3000
    if ! check_port 3000; then
        SKIP_FRONTEND=1
        echo -e "${YELLOW}⚠️  Skipping frontend startup because port 3000 is in use.${NC}"
    fi

    # Check port 8080
    if ! check_port 8080; then
        SKIP_BACKEND=1
        echo -e "${YELLOW}⚠️  Skipping backend startup because port 8080 is in use.${NC}"
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    if [ "$DB_ONLY" = false ]; then
        if [ ! -z "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID 2>/dev/null
            echo -e "${GREEN}✅ Frontend stopped${NC}"
        fi
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null
            echo -e "${GREEN}✅ Backend stopped${NC}"
        fi
    fi
    if [ ! -z "$POSTGRES_CONTAINER" ]; then
        docker stop $POSTGRES_CONTAINER >/dev/null 2>&1
        echo -e "${GREEN}✅ PostgreSQL stopped${NC}"
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start PostgreSQL
if [ "$SKIP_DB" -eq 0 ]; then
    echo -e "${BLUE}🗄️  Starting PostgreSQL...${NC}"

    # Check if PostgreSQL container already exists
    if docker ps -a --format "table {{.Names}}" | grep -q "bloodsugar-postgres"; then
        echo -e "${YELLOW}📦 PostgreSQL container exists, starting it...${NC}"
        docker start bloodsugar-postgres
        POSTGRES_CONTAINER="bloodsugar-postgres"
    else
        echo -e "${YELLOW}📦 Creating PostgreSQL container...${NC}"
        docker run -d \
            --name bloodsugar-postgres \
            -e POSTGRES_DB=bloodsugar \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=password \
            -p 5432:5432 \
            postgres:15
        POSTGRES_CONTAINER="bloodsugar-postgres"
    fi

    # Wait for PostgreSQL to be ready
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
    until docker exec $POSTGRES_CONTAINER pg_isready -U postgres >/dev/null 2>&1; do
        echo -n "."
        sleep 1
    done
    echo -e "\n${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Database will not be started due to port conflict.${NC}"
fi

# Only start backend and frontend if not in DB_ONLY mode
if [ "$DB_ONLY" = false ]; then
    # Start backend with hot reload
    echo "Starting backend with hot reload..."
    cd backend
    DOTNET_ENVIRONMENT=Development dotnet watch run &
    cd ..
    BACKEND_PID=$!

    # Wait a moment for backend to start
    sleep 5

    # Check if backend started successfully
    if ! curl -s http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "${YELLOW}⏳ Backend is starting up...${NC}"
        # Wait a bit more for backend to fully start
        sleep 10
    fi

    # Start frontend
    if [ "$SKIP_FRONTEND" -eq 0 ]; then
        echo -e "${BLUE}🌐 Starting frontend...${NC}"
        cd frontend

        # Check if frontend dependencies are installed
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
            npm install
        fi

        # Start frontend in background
        echo -e "${GREEN}🚀 Starting frontend on http://localhost:3000${NC}"
        npm start &
        FRONTEND_PID=$!
        cd ..
    else
        echo -e "${YELLOW}⚠️  Frontend will not be started due to port conflict.${NC}"
    fi

    # Wait for services to be ready
    echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
    sleep 10
else
    echo -e "${GREEN}✅ Database-only mode: Backend and frontend will not be started${NC}"
fi

# Check if services are running
echo -e "${BLUE}🔍 Checking service status...${NC}"

# Check PostgreSQL
if [ "$SKIP_DB" -eq 0 ]; then
    if docker exec $POSTGRES_CONTAINER pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is running on localhost:5432${NC}"
    else
        echo -e "${RED}❌ PostgreSQL is not responding${NC}"
        cleanup
    fi
fi

# Only check backend and frontend if not in DB_ONLY mode
if [ "$DB_ONLY" = false ]; then
    if [ "$SKIP_BACKEND" -eq 0 ]; then
        if curl -s http://localhost:8080/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is running on http://localhost:8080${NC}"
        else
            echo -e "${RED}❌ Backend is not responding${NC}"
            cleanup
        fi
    fi
    if [ "$SKIP_FRONTEND" -eq 0 ]; then
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
        else
            echo -e "${YELLOW}⏳ Frontend is still starting up...${NC}"
        fi
    fi
    echo ""
    echo -e "${GREEN}🎉 Development environment is ready!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "${BLUE}🔧 Backend API: ${GREEN}http://localhost:8080${NC}"
    echo -e "${BLUE}🗄️  Database: ${GREEN}localhost:5432${NC}"
    echo -e "${BLUE}   Database Name: ${GREEN}bloodsugar${NC}"
    echo -e "${BLUE}   Username: ${GREEN}postgres${NC}"
    echo -e "${BLUE}   Password: ${GREEN}password${NC}"
    echo ""
    echo -e "${YELLOW}📝 Press Ctrl+C to stop all services${NC}"
    echo ""
    echo -e "${BLUE}📋 Service logs (Ctrl+C to stop):${NC}"
    echo ""
    # Wait for user to stop
    wait
else
    echo ""
    echo -e "${GREEN}🎉 Database is ready!${NC}"
    echo ""
    echo -e "${BLUE}🗄️  Database: ${GREEN}localhost:5432${NC}"
    echo -e "${BLUE}   Database Name: ${GREEN}bloodsugar${NC}"
    echo -e "${BLUE}   Username: ${GREEN}postgres${NC}"
    echo -e "${BLUE}   Password: ${GREEN}password${NC}"
    echo ""
    echo -e "${YELLOW}📝 Press Ctrl+C to stop database${NC}"
    echo ""
    # Keep script running
    wait
fi 