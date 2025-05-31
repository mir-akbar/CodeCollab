// Test file for automatic refresh functionality
console.log("Testing automatic refresh on upload");

function testAutoRefresh() {
    console.log("This file was uploaded to test the automatic refresh feature");
    console.log("If you can see this in the sidebar without clicking refresh, it works!");
    
    // Test various JavaScript features
    const testArray = [1, 2, 3, 4, 5];
    const doubled = testArray.map(x => x * 2);
    
    console.log("Original array:", testArray);
    console.log("Doubled array:", doubled);
    
    return "Auto refresh test successful!";
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testAutoRefresh };
}

testAutoRefresh();
