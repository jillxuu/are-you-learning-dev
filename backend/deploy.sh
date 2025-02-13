#!/bin/bash

# Exit on error
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-""}
REGION=${GOOGLE_CLOUD_REGION:-"us-central1"}
SERVICE_NAME="are-you-learning-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install the Google Cloud SDK first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth print-identity-token &> /dev/null; then
    echo -e "${YELLOW}You are not logged in to gcloud.${NC}"
    echo "Please login first:"
    gcloud auth login
fi

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project)

# If PROJECT_ID is not set, let user select a project
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No project ID specified.${NC}"
    echo "Available projects:"
    gcloud projects list --format="table(projectId,name)"
    echo ""
    echo -e "Current project: ${GREEN}$CURRENT_PROJECT${NC}"
    read -p "Enter the project ID to use (press Enter to use current project): " PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$CURRENT_PROJECT
    fi
fi

# Set the project
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Switching to project: ${PROJECT_ID}${NC}"
    gcloud config set project $PROJECT_ID
fi

# Confirm project and region
echo -e "\n${GREEN}Deployment Configuration:${NC}"
echo -e "Project ID: ${GREEN}$PROJECT_ID${NC}"
echo -e "Region: ${GREEN}$REGION${NC}"
echo -e "Service Name: ${GREEN}$SERVICE_NAME${NC}"
echo ""

read -p "Do you want to proceed with this configuration? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 1
fi

# Enable required APIs
echo -e "\n${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com

# Build and push the image
echo -e "\n${YELLOW}Building and pushing Docker image...${NC}"
IMAGE_URL="gcr.io/$PROJECT_ID/$SERVICE_NAME"
gcloud builds submit --tag $IMAGE_URL

# Deploy to Cloud Run
echo -e "\n${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_URL \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="OPENAI_API_KEY=${OPENAI_API_KEY:-},APTOS_NODE_URL=${APTOS_NODE_URL:-}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo -e "\n${GREEN}Deployment Complete!${NC}"
echo -e "Service URL: ${GREEN}$SERVICE_URL${NC}" 