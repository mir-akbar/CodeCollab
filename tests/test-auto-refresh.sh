#!/bin/bash

# Test script to verify automatic refresh after file upload using curl
echo "🧪 Testing automatic refresh after file upload..."

API_URL="http://localhost:3012"
TEST_SESSION="test-auto-refresh-session"

# Create a temporary test file
TEST_FILE="/tmp/test-auto-refresh.js"
cat > "$TEST_FILE" << 'EOF'
// Auto-generated test file for refresh testing
console.log("Testing automatic refresh functionality");
const testTime = new Date().toISOString();
console.log("Generated at:", testTime);

function testAutoRefresh() {
    console.log("🔄 This file should appear automatically in sidebar");
    return "Auto-refresh test completed!";
}

testAutoRefresh();
EOF

echo "📤 Uploading test file to session: $TEST_SESSION"

# Upload the file using curl
response=$(curl -s -X POST \
  -F "file=@$TEST_FILE" \
  -F "sessionID=$TEST_SESSION" \
  -F "email=test@example.com" \
  "$API_URL/file-upload/file-upload")

echo "📋 Upload response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

# Wait a moment
sleep 2

# Check files in session
echo ""
echo "📁 Checking files in session after upload..."
session_response=$(curl -s "$API_URL/files/by-session?session=$TEST_SESSION")
echo "Session files:"
echo "$session_response" | jq . 2>/dev/null || echo "$session_response"

# Clean up
rm -f "$TEST_FILE"

echo ""
echo "✅ Test completed!"
echo "🔄 Now check the browser with session ID: $TEST_SESSION"
echo "📋 The file should appear automatically in the sidebar without manual refresh"
