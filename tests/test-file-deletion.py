#!/usr/bin/env python3
"""
Test script to verify file deletion behavior
This file can be uploaded and then deleted to test the editor clearing functionality
"""

def main():
    print("Hello! This is a test file for deletion behavior.")
    print("Steps to test:")
    print("1. Upload this file to the application")
    print("2. Open it in the editor")
    print("3. Delete it from the sidebar")
    print("4. Verify the editor content is cleared")
    print("5. Verify the editor shows appropriate message")
    
    # Some sample code to make it interesting
    numbers = [1, 2, 3, 4, 5]
    squared = [x**2 for x in numbers]
    print(f"Original numbers: {numbers}")
    print(f"Squared numbers: {squared}")
    
    return "Test completed successfully!"

if __name__ == "__main__":
    result = main()
    print(result)
