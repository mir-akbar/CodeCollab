#!/usr/bin/env python3

import requests
import sys

def test_sidebar_update():
    session_id = "2cba80bb-bce4-4d46-961d-d37e7e836f49"
    api_url = "http://localhost:3012"
    
    print(f"🧪 Testing sidebar update for session: {session_id}")
    
    # Create a simple test file
    test_content = '''console.log("Testing sidebar update!");
const currentTime = new Date().toISOString();
console.log("File created at:", currentTime);
'''
    
    # Upload the file
    files = {
        'file': ('sidebar_update_test.js', test_content, 'text/javascript')
    }
    
    data = {
        'sessionID': session_id,
        'email': 'test@example.com'
    }
    
    try:
        print("📤 Uploading test file...")
        response = requests.post(f"{api_url}/file-upload/file-upload", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"   Message: {result.get('message', 'No message')}")
            print(f"   Files: {len(result.get('files', []))} files")
            for file in result.get('files', []):
                print(f"     - {file.get('name')} ({file.get('size')} bytes)")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
        # Check if file appears in the API
        print("\n🔍 Checking API response...")
        api_response = requests.get(f"{api_url}/files/by-session?session={session_id}")
        
        if api_response.status_code == 200:
            files = api_response.json()
            print(f"✅ API returned {len(files)} files:")
            for file in files:
                print(f"     - {file.get('name')} ({file.get('size')} bytes)")
        else:
            print(f"❌ API check failed: {api_response.status_code}")
            
        print("\n🔄 Now check if the sidebar shows the new files!")
        print("   Look for console logs starting with 📤 or 🔍 in the browser developer tools")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_sidebar_update()
