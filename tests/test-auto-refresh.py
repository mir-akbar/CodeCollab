#!/usr/bin/env python3
"""
Test script to verify automatic refresh after file upload
This will upload a file and check if it appears automatically in the sidebar
"""

import requests
import time
import sys

API_URL = "http://localhost:3012"
TEST_SESSION = "test-auto-refresh-session"

def test_upload_and_refresh():
    print("🧪 Testing automatic refresh after file upload...")
    
    # Create test file content
    test_content = '''// Auto-generated test file
console.log("Testing automatic refresh functionality");
const testTime = new Date().toISOString();
console.log("Generated at:", testTime);
'''
    
    # Prepare file for upload
    files = {
        'file': ('test-auto-refresh.js', test_content.encode(), 'application/javascript')
    }
    
    data = {
        'sessionID': TEST_SESSION,
        'email': 'test@example.com'
    }
    
    try:
        print(f"📤 Uploading test file to session: {TEST_SESSION}")
        response = requests.post(f"{API_URL}/file-upload/file-upload", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful! Files returned: {len(result.get('files', []))}")
            print(f"📄 File details: {result}")
            
            # Wait a moment and check if file exists
            time.sleep(2)
            
            # Check files by session
            session_response = requests.get(f"{API_URL}/files/by-session?session={TEST_SESSION}")
            if session_response.status_code == 200:
                files_in_session = session_response.json()
                print(f"📁 Files in session after upload: {len(files_in_session)}")
                for file_info in files_in_session:
                    print(f"   - {file_info.get('name', 'Unknown')} ({file_info.get('path', 'No path')})")
                
                return True
            else:
                print(f"❌ Failed to fetch session files: {session_response.status_code}")
                return False
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"💥 Error during test: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting automatic refresh test...")
    success = test_upload_and_refresh()
    
    if success:
        print("✅ Test completed successfully!")
        print("🔄 Now check the browser - the file should appear automatically in the sidebar")
        print(f"📋 Session ID for manual testing: {TEST_SESSION}")
    else:
        print("❌ Test failed!")
        sys.exit(1)
