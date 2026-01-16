#!/bin/bash

# Meta-Genesis API Testing Script
# Make sure the server is running first: npm run dev

echo "🧪 Testing Meta-Genesis API"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

# Test 1: Ping endpoint
echo "Test 1: Health Check"
echo "→ GET $BASE_URL/ping"
curl -s $BASE_URL/ping | jq .
echo ""

# Test 2: Create an agent
echo "Test 2: Create Agent (Amazon Price Tracker)"
echo "→ POST $BASE_URL/genesis"

RESPONSE=$(curl -s -X POST $BASE_URL/genesis \
  -H "Content-Type: application/json" \
  -d '{
    "user_intent": "Track product prices on Amazon",
    "target_url": "https://www.amazon.com/dp/B08N5WRWNW",
    "personality": "professional"
  }')

echo $RESPONSE | jq .
AGENT_ID=$(echo $RESPONSE | jq -r '.agent_id')
echo ""

if [ "$AGENT_ID" != "null" ]; then
  echo -e "${GREEN}✓ Agent created: $AGENT_ID${NC}"
  echo ""

  # Test 3: Check status
  echo "Test 3: Check Agent Status"
  echo "→ GET $BASE_URL/status/$AGENT_ID"

  # Poll status for 30 seconds
  for i in {1..15}; do
    echo "Poll #$i..."
    STATUS_RESPONSE=$(curl -s $BASE_URL/status/$AGENT_ID)
    echo $STATUS_RESPONSE | jq .

    STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')

    if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ]; then
      break
    fi

    sleep 2
  done

  echo ""

  # Test 4: Get timeline
  echo "Test 4: Get Timeline"
  echo "→ GET $BASE_URL/timeline/$AGENT_ID"
  curl -s $BASE_URL/timeline/$AGENT_ID | jq .
  echo ""

else
  echo -e "${RED}✗ Failed to create agent${NC}"
fi

# Test 5: Get all statuses
echo "Test 5: Get All Agents"
echo "→ GET $BASE_URL/status"
curl -s $BASE_URL/status | jq .
echo ""

echo "=============================="
echo "✓ All tests completed"
