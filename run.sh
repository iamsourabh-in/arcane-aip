#!/bin/bash

# Navigate to the project root directory
cd "$(dirname "$0")"

# File to store the PIDs of the running services
PID_FILE="service_pids.txt"

# Function to run a service
run_service() {
    local service_dir=$1
    local service_script=$2
    local service_name=$3

    # Check if the service directory exists
    if [ -d "$service_dir" ]; then
        # Navigate to the service directory
        cd "$service_dir"
        # Run the service script in the background and capture the PID
        node "$service_script" &
        local pid=$!
        echo $pid >> "../$PID_FILE"
        echo "$service_name started with PID $pid."
        # Return to the project root directory
        cd -
    else
        echo "Directory $service_dir does not exist."
    fi
}

# Function to start all services
start_services() {
    echo "Starting all services..."
    > "$PID_FILE" # Clear the PID file

    run_service "node-llm" "nodeLlmService.js" "Node-LLM Service"
    sleep 1
    run_service "token-granting-service" "tokenGrantingService.js" "Token Granting Service"
    sleep 1
    run_service "oblivious-gateway" "obliviousGateway.js" "Oblivious Gateway"
    sleep 1
    run_service "identity-service" "identityService.js" "Identity Service"
    sleep 1
    run_service "relay-service" "relayService.js" "Relay Service"
    
    echo "All services are running."
}

# Function to stop all services
stop_services() {
    echo "Stopping all services..."
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                echo "Stopped service with PID $pid."
            fi
        done < "$PID_FILE"
        rm "$PID_FILE"
    else
        echo "No services are currently running."
    fi
}

# Trap SIGINT (Ctrl+C) and call stop_services
trap stop_services SIGINT

# Start services and wait
start_services
echo "Press Ctrl+C to stop all services."
wait
