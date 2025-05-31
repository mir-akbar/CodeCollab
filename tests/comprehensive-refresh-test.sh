#!/bin/bash

echo "🧪 Comprehensive Automatic Refresh Test"
echo "======================================"

# Test session ID
SESSION_ID="test-auto-refresh-$(date +%s)"
echo "📋 Using test session: $SESSION_ID"

# Function to check files in session
check_files() {
    echo "🔍 Checking files in session $SESSION_ID..."
    curl -s "http://localhost:3012/files/by-session?session=$SESSION_ID" | jq .
}

# Function to upload a file
upload_file() {
    local filename="$1"
    local content="$2"
    
    echo "📤 Uploading file: $filename"
    
    # Create temporary file
    echo "$content" > "/tmp/$filename"
    
    # Upload via API
    local response=$(curl -s -X POST "http://localhost:3012/file-upload/file-upload" \
        -F "file=@/tmp/$filename" \
        -F "sessionID=$SESSION_ID" \
        -F "email=test@example.com")
    
    echo "✅ Upload response: $response"
    
    # Clean up temp file
    rm "/tmp/$filename"
    
    # Check files after upload
    echo "📁 Files after upload:"
    check_files
    echo ""
}

echo ""
echo "1️⃣ Initial state (should be empty):"
check_files
echo ""

echo "2️⃣ Upload first test file..."
upload_file "first-test.js" "console.log('First test file for automatic refresh');"

echo "3️⃣ Upload second test file..."
upload_file "second-test.js" "console.log('Second test file - should appear automatically');"

echo "4️⃣ Upload third test file..."
upload_file "third-test.js" "console.log('Third test file - testing real-time updates');"

echo "🎯 Test Summary:"
echo "- If WebSocket events are working, each upload should trigger automatic refresh"
echo "- Files should appear in the sidebar without manual refresh button clicks"
echo "- The session files endpoint should show all uploaded files"

echo ""
echo "📊 Final file count:"
FILE_COUNT=$(curl -s "http://localhost:3012/files/by-session?session=$SESSION_ID" | jq '. | length')
echo "Total files in session $SESSION_ID: $FILE_COUNT"

if [ "$FILE_COUNT" -eq 3 ]; then
    echo "✅ SUCCESS: All 3 files uploaded correctly!"
else
    echo "❌ ISSUE: Expected 3 files, found $FILE_COUNT"
fi

echo ""
echo "🌐 Browser test URL:"
echo "http://localhost:5175/workspace?session=$SESSION_ID"
echo ""
echo "💡 Open this URL in your browser to test the automatic refresh visually!"

# Open browser automatically (optional)
read -p "🚀 Open browser automatically? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "http://localhost:5175/workspace?session=$SESSION_ID"
    echo "🎉 Browser opened! Upload files through the UI to test automatic refresh."
fi
