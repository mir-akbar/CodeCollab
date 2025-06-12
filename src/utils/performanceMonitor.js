/**
 * Performance Monitoring Utility
 * Tracks timing for file loading operations
 */

class PerformanceMonitor {
  constructor() {
    this.timings = new Map();
    this.isEnabled = true; // Set to false to disable logging
  }

  start(operation, filePath) {
    if (!this.isEnabled) return;
    
    const key = `${operation}:${filePath}`;
    this.timings.set(key, {
      operation,
      filePath,
      startTime: performance.now(),
      checkpoints: []
    });
    
    console.log(`⏱️ [PERF] Started ${operation} for ${filePath}`);
  }

  checkpoint(operation, filePath, checkpointName) {
    if (!this.isEnabled) return;
    
    const key = `${operation}:${filePath}`;
    const timing = this.timings.get(key);
    
    if (timing) {
      const now = performance.now();
      const elapsed = now - timing.startTime;
      timing.checkpoints.push({
        name: checkpointName,
        time: now,
        elapsed
      });
      
      console.log(`📍 [PERF] ${operation} - ${checkpointName}: ${elapsed.toFixed(2)}ms`);
    }
  }

  end(operation, filePath) {
    if (!this.isEnabled) return;
    
    const key = `${operation}:${filePath}`;
    const timing = this.timings.get(key);
    
    if (timing) {
      const totalTime = performance.now() - timing.startTime;
      timing.endTime = performance.now();
      timing.totalTime = totalTime;
      
      console.log(`✅ [PERF] Completed ${operation} for ${filePath}: ${totalTime.toFixed(2)}ms`);
      
      // Log detailed breakdown
      if (timing.checkpoints.length > 0) {
        console.group(`📊 [PERF] Breakdown for ${operation}:`);
        timing.checkpoints.forEach(checkpoint => {
          console.log(`  ${checkpoint.name}: ${checkpoint.elapsed.toFixed(2)}ms`);
        });
        console.groupEnd();
      }
      
      // Clean up after logging
      setTimeout(() => {
        this.timings.delete(key);
      }, 1000);
    }
  }

  getReport() {
    if (!this.isEnabled) return 'Performance monitoring disabled';
    
    const report = [];
    for (const [key, timing] of this.timings.entries()) {
      report.push({
        operation: timing.operation,
        filePath: timing.filePath,
        totalTime: timing.totalTime || (performance.now() - timing.startTime),
        checkpoints: timing.checkpoints
      });
    }
    
    return report;
  }

  clear() {
    this.timings.clear();
    console.log('🧹 [PERF] Cleared all performance data');
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common operations
export const trackFileLoading = {
  start: (filePath) => performanceMonitor.start('file-loading', filePath),
  cacheCheck: (filePath) => performanceMonitor.checkpoint('file-loading', filePath, 'cache-check'),
  apiRequest: (filePath) => performanceMonitor.checkpoint('file-loading', filePath, 'api-request-start'),
  apiResponse: (filePath) => performanceMonitor.checkpoint('file-loading', filePath, 'api-response'),
  editorMount: (filePath) => performanceMonitor.checkpoint('file-loading', filePath, 'editor-mount'),
  contentSet: (filePath) => performanceMonitor.checkpoint('file-loading', filePath, 'content-set'),
  end: (filePath) => performanceMonitor.end('file-loading', filePath)
};

export const trackCollaboration = {
  start: (filePath) => performanceMonitor.start('collaboration', filePath),
  connecting: (filePath) => performanceMonitor.checkpoint('collaboration', filePath, 'connecting'),
  connected: (filePath) => performanceMonitor.checkpoint('collaboration', filePath, 'connected'),
  bindingCreated: (filePath) => performanceMonitor.checkpoint('collaboration', filePath, 'binding-created'),
  end: (filePath) => performanceMonitor.end('collaboration', filePath)
};

export default performanceMonitor;
