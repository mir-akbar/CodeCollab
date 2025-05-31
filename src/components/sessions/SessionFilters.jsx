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

export const SessionFilters = ({ 
  filters, 
  onFilterChange
}) => {
  const sortOptions = [
    { value: "recent", label: "Recent", icon: <History className="h-4 w-4 mr-2" /> },
    { value: "name", label: "Name", icon: <Code2 className="h-4 w-4 mr-2" /> },
    { value: "favorites", label: "Favorites", icon: <Star className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
      {/* Search Input */}
      <div className="relative flex-1 w-full md:w-auto">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions..."
          className="pl-8 bg-black"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Filter Group */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Sort Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 bg-black"
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
                onSelect={() => onFilterChange({ ...filters, sort: option.value })}
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

SessionFilters.propTypes = {
  filters: PropTypes.shape({
    search: PropTypes.string,
    sort: PropTypes.string
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired
};