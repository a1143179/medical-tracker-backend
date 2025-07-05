#!/bin/bash

echo "🚀 Starting Blood Sugar History Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to kill process on a port
kill_process_on_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔍 Found process $pid using port $port${NC}"
        read -p "Do you want to kill this process? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}🛑 Killing process $pid...${NC}"
            kill -9 $pid
            sleep 2
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
                echo -e "${RED}❌ Failed to kill process on port $port${NC}"
                return 1
            else
                echo -e "${GREEN}✅ Successfully freed port $port${NC}"
                return 0
            fi
        else
            echo -e "${RED}❌ Port $port is still occupied. Exiting.${NC}"
            return 1
        fi
    fi
    return 1
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

# Check ports and offer to kill processes if needed
echo -e "${BLUE}🔍 Checking ports...${NC}"

# Check port 3000
if ! check_port 3000; then
    if ! kill_process_on_port 3000; then
        exit 1
    fi
fi

# Check port 8080
if ! check_port 8080; then
    if ! kill_process_on_port 8080; then
        exit 1
    fi
fi

# Check port 5432
if ! check_port 5432; then
    if ! kill_process_on_port 5432; then
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✅ Backend stopped${NC}"
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

# Start backend
echo -e "${BLUE}🔧 Starting backend...${NC}"
cd backend

# Check if backend dependencies are installed
if [ ! -d "bin" ] || [ ! -d "obj" ]; then
    echo -e "${YELLOW}📦 Restoring backend dependencies...${NC}"
    dotnet restore
fi

# Start backend in background
echo -e "${GREEN}🚀 Starting backend on http://localhost:8080${NC}"
dotnet run &
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
echo -e "${BLUE}🌐 Starting frontend...${NC}"
cd ../frontend

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background
echo -e "${GREEN}🚀 Starting frontend on http://localhost:3000${NC}"
npm start &
FRONTEND_PID=$!

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
echo -e "${BLUE}🔍 Checking service status...${NC}"

# Check PostgreSQL
if docker exec $POSTGRES_CONTAINER pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is running on localhost:5432${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not responding${NC}"
    cleanup
fi

# Check backend
if curl -s http://localhost:8080/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:8080${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    cleanup
fi

# Check frontend
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⏳ Frontend is still starting up...${NC}"
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

# Keep script running and show logs
echo -e "${BLUE}📋 Service logs (Ctrl+C to stop):${NC}"
echo ""

# Wait for user to stop
wait 