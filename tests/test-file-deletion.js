// Test file for deletion behavior verification
// This file can be uploaded, opened, and then deleted to test editor clearing

function testDeletionBehavior() {
    console.log("🧪 Testing file deletion behavior");
    console.log("📋 Steps:");
    console.log("1. Upload this file");
    console.log("2. Open it in the editor");
    console.log("3. Delete it from sidebar");
    console.log("4. Check if editor clears properly");
    
    const testData = {
        filename: "test-file-deletion.js",
        purpose: "Test file deletion behavior",
        expected: "Editor should clear when file is deleted"
    };
    
    return testData;
}

// Sample function to make the file more substantial
function calculateSum(numbers) {
    return numbers.reduce((sum, num) => sum + num, 0);
}

// Sample usage
const sampleNumbers = [10, 20, 30, 40, 50];
const total = calculateSum(sampleNumbers);
console.log(`Sum of ${sampleNumbers.join(', ')} = ${total}`);

// Export for testing
module.exports = { testDeletionBehavior, calculateSum };
