#!/bin/bash

# Parse arguments for multiple flags
RUN_DB=false
RUN_BACKEND=false
RUN_FRONTEND=false

if [ $# -eq 0 ]; then
  RUN_DB=true
  RUN_BACKEND=true
  RUN_FRONTEND=true
  echo "🚀 Starting Blood Sugar History: Database, Backend, and Frontend (Full Environment)"
else
  for arg in "$@"; do
    case $arg in
      --db)
        RUN_DB=true
        ;;
      --backend)
        RUN_BACKEND=true
        ;;
      --frontend)
        RUN_FRONTEND=true
        ;;
      *)
        echo "Unknown argument: $arg"
        exit 1
        ;;
    esac
  done
  echo -n "🚀 Starting: "
  $RUN_DB && echo -n "Database "
  $RUN_BACKEND && echo -n "Backend "
  $RUN_FRONTEND && echo -n "Frontend Build "
  echo
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

# Check ports based on mode
if [ "$RUN_DB" = false ] && [ "$RUN_BACKEND" = false ] && [ "$RUN_FRONTEND" = false ]; then
    # Full start mode - check port 3000 (backend + frontend)
    if ! check_port 3000; then
        SKIP_BACKEND=1
        SKIP_FRONTEND=1
        echo -e "${YELLOW}⚠️  Skipping backend and frontend startup because port 3000 is in use.${NC}"
    fi
elif [ "$RUN_BACKEND" = true ]; then
    # Backend only mode - check port 3000
    if ! check_port 3000; then
        SKIP_BACKEND=1
        echo -e "${YELLOW}⚠️  Skipping backend startup because port 3000 is in use.${NC}"
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    if [ "$RUN_DB" = false ] && [ "$RUN_BACKEND" = false ] && [ "$RUN_FRONTEND" = false ]; then
        # Full start mode cleanup
        if [ ! -z "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID 2>/dev/null
            echo -e "${GREEN}✅ Frontend stopped${NC}"
        fi
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null
            echo -e "${GREEN}✅ Backend stopped${NC}"
        fi
    elif [ "$RUN_BACKEND" = true ]; then
        # Backend only mode cleanup
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null
            echo -e "${GREEN}✅ Backend stopped${NC}"
        fi
    fi
    # Only stop the database if --db was NOT specified
    if [ "$RUN_DB" = false ] && [ ! -z "$POSTGRES_CONTAINER" ]; then
        docker stop $POSTGRES_CONTAINER >/dev/null 2>&1
        echo -e "${GREEN}✅ PostgreSQL stopped${NC}"
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start PostgreSQL
if [ "$RUN_DB" = true ]; then
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
fi

# Start backend
if [ "$RUN_BACKEND" = true ]; then
    if [ "$SKIP_BACKEND" -eq 0 ]; then
        echo -e "${BLUE}🔧 Starting backend with hot reload...${NC}"
        cd backend
        DOTNET_ENVIRONMENT=Development dotnet watch run &
        cd ..
        BACKEND_PID=$!
        sleep 5
        if ! curl -s http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${YELLOW}⏳ Backend is starting up...${NC}"
            sleep 10
        fi
    fi
fi

# Build frontend
if [ "$RUN_FRONTEND" = true ]; then
    if [ "$SKIP_FRONTEND" -eq 0 ]; then
        echo -e "${BLUE}🌐 Building frontend...${NC}"
        cd frontend

        # Check if frontend dependencies are installed
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
            npm install
        fi

        # Build frontend for production
        echo -e "${GREEN}🔨 Building frontend for production...${NC}"
        npm run build
        
        # Copy build to backend/wwwroot directory
        echo -e "${GREEN}📁 Copying frontend build to backend/wwwroot...${NC}"
        rm -rf ../backend/wwwroot
        mkdir -p ../backend/wwwroot
        cp -r build/* ../backend/wwwroot/
        
        cd ..
        echo -e "${GREEN}✅ Frontend build completed and copied to backend/wwwroot${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend will not be built due to port conflict.${NC}"
    fi
fi

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
echo -e "${BLUE}🔍 Checking service status...${NC}"

# Check PostgreSQL
if [ "$RUN_DB" = true ]; then
    if [ "$SKIP_DB" -eq 0 ]; then
        if docker exec $POSTGRES_CONTAINER pg_isready -U postgres >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL is running on localhost:5432${NC}"
        else
            echo -e "${RED}❌ PostgreSQL is not responding${NC}"
            cleanup
        fi
    fi
fi

# Check service status based on mode
if [ "$RUN_DB" = true ]; then
    # Full start mode - check both backend and frontend
    if [ "$SKIP_BACKEND" -eq 0 ]; then
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is running on http://localhost:3000${NC}"
        else
            echo -e "${RED}❌ Backend is not responding${NC}"
            # Only call cleanup if --db was NOT specified
            if [ "$RUN_DB" = false ]; then
                cleanup
            fi
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
    echo -e "${GREEN}🎉 Full development environment is ready!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Application: ${GREEN}http://localhost:3000${NC}"
    echo -e "${BLUE}🔧 Backend API: ${GREEN}http://localhost:3000/api${NC}"
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

elif [ "$RUN_BACKEND" = true ]; then
    # Backend only mode - check only backend
    if [ "$SKIP_BACKEND" -eq 0 ]; then
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is running on http://localhost:3000${NC}"
        else
            echo -e "${RED}❌ Backend is not responding${NC}"
            cleanup
        fi
    fi
    echo ""
    echo -e "${GREEN}🎉 Backend is ready!${NC}"
    echo ""
    echo -e "${BLUE}🔧 Backend API: ${GREEN}http://localhost:3000/api${NC}"
    echo -e "${BLUE}🗄️  Database: ${GREEN}localhost:5432${NC}"
    echo -e "${BLUE}   Database Name: ${GREEN}bloodsugar${NC}"
    echo -e "${BLUE}   Username: ${GREEN}postgres${NC}"
    echo -e "${BLUE}   Password: ${GREEN}password${NC}"
    echo ""
    echo -e "${YELLOW}📝 Press Ctrl+C to stop backend${NC}"
    echo ""
    echo -e "${BLUE}📋 Service logs (Ctrl+C to stop):${NC}"
    echo ""
    # Wait for user to stop
    wait

elif [ "$RUN_FRONTEND" = true ]; then
    # Frontend only mode - already completed
    echo ""
    echo -e "${GREEN}🎉 Frontend build completed!${NC}"
    echo ""
    echo -e "${BLUE}📁 Build files copied to: ${GREEN}backend/wwwroot/${NC}"
    echo ""
    exit 0

elif [ "$RUN_DB" = true ]; then
    # Database only mode
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