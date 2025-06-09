/**
 * Session Component Test Suite
 * 
 * Comprehensive testing component to demonstrate Phase 4 enhancements.
 * Tests shared state management, utility functions, and debug functionality.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Testing Component
 * @since 4.1.0
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  Play,
  RotateCcw
} from 'lucide-react';
import { useSessionManagerState } from '@/hooks/useSessionState';
import { 
  normalizeSession,
  formatSessionDate,
  getParticipantCount,
  generateSessionKey,
  logDebugInfo,
  searchSessions,
  sortSessions
} from '../utils/sessionComponentUtils';

/**
 * Mock session data for testing
 */
const mockSessions = [
  {
    id: 'sess_1',
    name: 'React Workshop',
    description: 'Learning React hooks and state management',
    creator: 'instructor@example.com',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    participants: [
      { email: 'student1@example.com', name: 'John Doe', role: 'viewer' },
      { email: 'student2@example.com', name: 'Jane Smith', role: 'editor' }
    ],
    status: 'active'
  },
  {
    sessionId: 'sess_2',
    name: 'JavaScript Fundamentals',
    creator: 'teacher@example.com',
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    participants: [
      { email: 'learner@example.com', name: 'Bob Wilson', role: 'viewer' }
    ],
    isFavorite: true
  }
];

/**
 * Test result component
 */
const TestResult = ({ test, result, duration }) => (
  <div className="flex items-center justify-between p-2 border rounded-lg">
    <div className="flex items-center gap-2">
      {result.success ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm font-medium">{test}</span>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant={result.success ? "default" : "destructive"}>
        {result.success ? "PASS" : "FAIL"}
      </Badge>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {duration}ms
      </div>
    </div>
  </div>
);

/**
 * Main test suite component
 */
export const SessionComponentTestSuite = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Test shared state management
  const {
    dialogs,
    openDialog,
    closeDialog,
    activeTab,
    setActiveTab,
    filters,
    updateFilters,
    resetFilters,
    loadingStates,
    setLoading,
    debug
  } = useSessionManagerState({
    enableDebug: true
  });

  /**
   * Run utility function tests
   */
  const runUtilityTests = () => {
    const tests = [];
    
    // Test session normalization
    const startTime = performance.now();
    try {
      const normalized = normalizeSession(mockSessions[1]);
      tests.push({
        test: 'Session Normalization',
        result: { 
          success: !!(normalized.id && normalized.name && normalized.creator),
          details: normalized
        },
        duration: Math.round(performance.now() - startTime)
      });
    } catch (error) {
      tests.push({
        test: 'Session Normalization',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - startTime)
      });
    }

    // Test date formatting
    const dateStart = performance.now();
    try {
      const formatted = formatSessionDate(mockSessions[0].createdAt);
      tests.push({
        test: 'Date Formatting',
        result: { 
          success: typeof formatted === 'string' && formatted !== 'Unknown',
          details: formatted
        },
        duration: Math.round(performance.now() - dateStart)
      });
    } catch (error) {
      tests.push({
        test: 'Date Formatting',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - dateStart)
      });
    }

    // Test participant count
    const countStart = performance.now();
    try {
      const count = getParticipantCount(mockSessions[0].participants);
      tests.push({
        test: 'Participant Count',
        result: { 
          success: count === 2,
          details: `Count: ${count}`
        },
        duration: Math.round(performance.now() - countStart)
      });
    } catch (error) {
      tests.push({
        test: 'Participant Count',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - countStart)
      });
    }

    // Test key generation
    const keyStart = performance.now();
    try {
      const key = generateSessionKey(mockSessions[0], 0);
      tests.push({
        test: 'Key Generation',
        result: { 
          success: typeof key === 'string' && key.includes('session'),
          details: key
        },
        duration: Math.round(performance.now() - keyStart)
      });
    } catch (error) {
      tests.push({
        test: 'Key Generation',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - keyStart)
      });
    }

    // Test search functionality
    const searchStart = performance.now();
    try {
      const searchResults = searchSessions(mockSessions, 'React');
      tests.push({
        test: 'Session Search',
        result: { 
          success: searchResults.length === 1 && searchResults[0].name.includes('React'),
          details: `Found ${searchResults.length} results`
        },
        duration: Math.round(performance.now() - searchStart)
      });
    } catch (error) {
      tests.push({
        test: 'Session Search',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - searchStart)
      });
    }

    // Test sorting functionality
    const sortStart = performance.now();
    try {
      const sorted = sortSessions(mockSessions, 'name');
      tests.push({
        test: 'Session Sorting',
        result: { 
          success: sorted[0].name <= sorted[1].name,
          details: `Order: ${sorted.map(s => s.name).join(', ')}`
        },
        duration: Math.round(performance.now() - sortStart)
      });
    } catch (error) {
      tests.push({
        test: 'Session Sorting',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - sortStart)
      });
    }

    return tests;
  };

  /**
   * Run state management tests
   */
  const runStateTests = () => {
    const tests = [];

    // Test dialog management
    const dialogStart = performance.now();
    try {
      openDialog('create');
      const isOpen = dialogs.create;
      closeDialog('create');
      const isClosed = !dialogs.create;
      
      tests.push({
        test: 'Dialog State Management',
        result: { 
          success: isOpen && isClosed,
          details: 'Open/Close operations successful'
        },
        duration: Math.round(performance.now() - dialogStart)
      });
    } catch (error) {
      tests.push({
        test: 'Dialog State Management',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - dialogStart)
      });
    }

    // Test filter management
    const filterStart = performance.now();
    try {
      updateFilters({ search: 'test' });
      const hasSearch = filters.search === 'test';
      resetFilters();
      const isReset = filters.search === '';
      
      tests.push({
        test: 'Filter State Management',
        result: { 
          success: hasSearch && isReset,
          details: 'Filter update/reset successful'
        },
        duration: Math.round(performance.now() - filterStart)
      });
    } catch (error) {
      tests.push({
        test: 'Filter State Management',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - filterStart)
      });
    }

    // Test loading state management
    const loadingStart = performance.now();
    try {
      setLoading('refreshing', true);
      const isLoading = loadingStates.refreshing;
      setLoading('refreshing', false);
      const isNotLoading = !loadingStates.refreshing;
      
      tests.push({
        test: 'Loading State Management',
        result: { 
          success: isLoading && isNotLoading,
          details: 'Loading state toggle successful'
        },
        duration: Math.round(performance.now() - loadingStart)
      });
    } catch (error) {
      tests.push({
        test: 'Loading State Management',
        result: { success: false, error: error.message },
        duration: Math.round(performance.now() - loadingStart)
      });
    }

    // Test debug state (if available)
    if (debug) {
      const debugStart = performance.now();
      try {
        const initialState = debug.debugState.isVisible;
        debug.toggleDebug();
        const toggledState = debug.debugState.isVisible;
        
        tests.push({
          test: 'Debug State Management',
          result: { 
            success: initialState !== toggledState,
            details: 'Debug toggle successful'
          },
          duration: Math.round(performance.now() - debugStart)
        });
      } catch (error) {
        tests.push({
          test: 'Debug State Management',
          result: { success: false, error: error.message },
          duration: Math.round(performance.now() - debugStart)
        });
      }
    }

    return tests;
  };

  /**
   * Run all tests
   */
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Log test start
    logDebugInfo('Starting Phase 4 component tests', {
      timestamp: new Date().toISOString(),
      mockSessions: mockSessions.length
    });

    try {
      // Add delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      const utilityResults = runUtilityTests();
      const stateResults = runStateTests();

      const allResults = [...utilityResults, ...stateResults];
      setTestResults(allResults);

      // Log test completion
      logDebugInfo('Phase 4 component tests completed', {
        totalTests: allResults.length,
        passed: allResults.filter(r => r.result.success).length,
        failed: allResults.filter(r => !r.result.success).length
      });

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const passedTests = testResults.filter(t => t.result.success).length;
  const totalTests = testResults.length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Session Components Test Suite
          <Badge variant="outline">Phase 4</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive testing for enhanced session components, shared state management, and utility functions.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setTestResults([])}
            disabled={isRunning || testResults.length === 0}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Clear Results
          </Button>

          {totalTests > 0 && (
            <Badge variant={passedTests === totalTests ? "default" : "secondary"}>
              {passedTests}/{totalTests} Passed
            </Badge>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <Separator />
            
            {/* Utility Function Tests */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Utility Function Tests</h3>
              <div className="space-y-2">
                {testResults.slice(0, 6).map((test, index) => (
                  <TestResult key={index} {...test} />
                ))}
              </div>
            </div>

            <Separator />

            {/* State Management Tests */}
            <div>
              <h3 className="text-lg font-semibold mb-3">State Management Tests</h3>
              <div className="space-y-2">
                {testResults.slice(6).map((test, index) => (
                  <TestResult key={index + 6} {...test} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Testing Instructions:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Click "Run All Tests" to test Phase 4 enhancements</li>
            <li>• Check browser console for debug logs (development mode)</li>
            <li>• Test debug panel by looking for red "Debug" button</li>
            <li>• Verify lazy loading and performance optimizations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionComponentTestSuite;
