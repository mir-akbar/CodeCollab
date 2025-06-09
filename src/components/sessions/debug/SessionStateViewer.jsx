/**
 * Session State Viewer
 * 
 * Development tool for inspecting session state in real-time.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Copy, 
  ChevronDown, 
  ChevronRight,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import PropTypes from 'prop-types';

export const SessionStateViewer = ({ 
  sessionData, 
  title = "Session State", 
  isCollapsible = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedPath, setCopiedPath] = useState('');

  const handleCopy = (data, path = '') => {
    const textToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(''), 2000);
  };

  const filterData = (obj, search) => {
    if (!search) return obj;
    
    const filtered = {};
    Object.keys(obj).forEach(key => {
      if (key.toLowerCase().includes(search.toLowerCase()) ||
          (typeof obj[key] === 'string' && obj[key].toLowerCase().includes(search.toLowerCase()))) {
        filtered[key] = obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nestedFiltered = filterData(obj[key], search);
        if (Object.keys(nestedFiltered).length > 0) {
          filtered[key] = nestedFiltered;
        }
      }
    });
    return filtered;
  };

  const renderValue = (value, key, path = '') => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className={value ? "text-green-400" : "text-red-400"}>{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-400">{value}</span>;
    }
    
    if (typeof value === 'string') {
      return (
        <span className="text-yellow-300">
          "{value.length > 50 ? `${value.substring(0, 50)}...` : value}"
        </span>
      );
    }
    
    if (Array.isArray(value)) {
      return (
        <details className="ml-2">
          <summary className="cursor-pointer text-purple-400">
            Array[{value.length}]
          </summary>
          <div className="ml-4 mt-1">
            {value.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-gray-500">[{index}]:</span>
                {renderValue(item, index, `${currentPath}[${index}]`)}
              </div>
            ))}
          </div>
        </details>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <details className="ml-2">
          <summary className="cursor-pointer text-cyan-400">
            Object ({Object.keys(value).length} keys)
          </summary>
          <div className="ml-4 mt-1">
            {Object.entries(value).map(([k, v]) => (
              <div key={k} className="flex gap-2 items-start mb-1">
                <Button
                  onClick={() => handleCopy(v, `${currentPath}.${k}`)}
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-gray-700"
                >
                  <Copy className="h-2 w-2" />
                </Button>
                <span className="text-green-300">{k}:</span>
                {renderValue(v, k, currentPath)}
              </div>
            ))}
          </div>
        </details>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  if (!sessionData) {
    return (
      <Card className="bg-gray-900 border-gray-700 text-white">
        <CardContent className="p-4">
          <div className="text-gray-400 text-center">No session data available</div>
        </CardContent>
      </Card>
    );
  }

  const displayData = filterData(sessionData, searchTerm);

  return (
    <Card className="bg-gray-900 border-gray-700 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            {title}
            <Badge variant="outline" className="text-xs">
              {Object.keys(sessionData).length} keys
            </Badge>
          </div>
          {isCollapsible && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      {(isExpanded || !isCollapsible) && (
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search keys or values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-xs"
            />
          </div>

          {/* Copy All Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => handleCopy(displayData, 'root')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              {copiedPath === 'root' ? 'Copied!' : 'Copy All'}
            </Button>
          </div>

          {/* Data Display */}
          <div className="max-h-64 overflow-y-auto text-xs font-mono">
            {Object.keys(displayData).length === 0 ? (
              <div className="text-gray-400 text-center py-4">
                No matches found for "{searchTerm}"
              </div>
            ) : (
              Object.entries(displayData).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-start mb-2 pb-2 border-b border-gray-700">
                  <Button
                    onClick={() => handleCopy(value, key)}
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-700"
                  >
                    <Copy className="h-2 w-2" />
                  </Button>
                  <span className="text-green-300 min-w-0">{key}:</span>
                  <div className="flex-1 min-w-0">
                    {renderValue(value, key)}
                  </div>
                  {copiedPath === key && (
                    <Badge variant="outline" className="text-xs text-green-400">
                      Copied!
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

SessionStateViewer.propTypes = {
  sessionData: PropTypes.object,
  title: PropTypes.string,
  isCollapsible: PropTypes.bool
};
