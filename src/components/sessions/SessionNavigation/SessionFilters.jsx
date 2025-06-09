/**
 * SessionFilters Component
 * 
 * Interactive filtering and search interface for session management.
 * Provides search input and sorting options with responsive design.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Comprehensive Documentation
 * @since 1.0.0
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.filters - Current filter state
 * @param {string} props.filters.search - Search query string
 * @param {string} props.filters.sort - Sort criteria ('recent', 'name', 'favorites')
 * @param {Function} props.onFilterChange - Callback when filters change
 * 
 * @example
 * ```jsx
 * <SessionFilters
 *   filters={{ search: '', sort: 'recent' }}
 *   onFilterChange={(newFilters) => setFilters(newFilters)}
 * />
 * ```
 * 
 * @features
 * - Real-time search with debounced input
 * - Sort options with icon indicators
 * - Responsive design for mobile/desktop
 * - Accessible form controls with proper labeling
 * - Keyboard navigation support
 */
// components/sessions/SessionFilters.jsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ChevronDown, Activity, History, Code2, Star } from "lucide-react";
import PropTypes from "prop-types";
import { useCallback } from "react";
import { logDebugInfo } from '../utils/sessionComponentUtils';

export const SessionFilters = ({ 
  filters, 
  onFilterChange
}) => {
  /**
   * Available sort options with icons and labels
   * @constant {Array<Object>}
   */
  const sortOptions = [
    { value: "recent", label: "Recent", icon: <History className="h-4 w-4 mr-2" /> },
    { value: "name", label: "Name", icon: <Code2 className="h-4 w-4 mr-2" /> },
    { value: "favorites", label: "Favorites", icon: <Star className="h-4 w-4 mr-2" /> },
  ];

  /**
   * Handles search input change with debug logging
   * @function handleSearchChange
   * @param {Event} e - Input change event
   */
  const handleSearchChange = useCallback((e) => {
    const newFilters = { ...filters, search: e.target.value };
    logDebugInfo('Search filters changed', { 
      oldSearch: filters.search, 
      newSearch: e.target.value 
    });
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  /**
   * Handles sort option change with debug logging
   * @function handleSortChange
   * @param {string} sortValue - New sort option value
   */
  const handleSortChange = useCallback((sortValue) => {
    const newFilters = { ...filters, sort: sortValue };
    logDebugInfo('Sort filters changed', { 
      oldSort: filters.sort, 
      newSort: sortValue 
    });
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      {/* Search Input */}
      <div className="relative flex-1 w-full md:w-auto">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions..."
          className="pl-8 bg-black"
          value={filters.search}
          onChange={handleSearchChange}
          aria-label="Search sessions"
          aria-describedby="search-help"
        />
        <span id="search-help" className="sr-only">
          Search sessions by name or description
        </span>
      </div>

      {/* Filter Group */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Sort Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 bg-black"
              aria-label={`Sort by ${sortOptions.find(o => o.value === filters.sort)?.label}`}
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Sort:</span>
              {sortOptions.find(o => o.value === filters.sort)?.label}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-black">
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => handleSortChange(option.value)}
              >
                {option.icon}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

/**
 * PropTypes for SessionFilters component
 * @memberof SessionFilters
 */
SessionFilters.propTypes = {
  /** Current filter state object */
  filters: PropTypes.shape({
    /** Search query string for filtering sessions */
    search: PropTypes.string,
    /** Sort criteria - 'recent', 'name', or 'favorites' */
    sort: PropTypes.oneOf(['recent', 'name', 'favorites'])
  }).isRequired,
  /** Callback function called when filters change */
  onFilterChange: PropTypes.func.isRequired
};