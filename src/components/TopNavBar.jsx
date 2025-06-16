import { ChevronLeft, Menu, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSection } from './UserSection';
import { PathBreadCrumb } from './PathBreadCrumb';
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import PropTypes from 'prop-types';

export function TopNavBar({ 
  currentPath, 
  onRunCode, 
  isExecuting = false,
  extraActions = null 
}) {
  const navigate = useNavigate();
  const { toggleSidebar, open } = useSidebar();
  
  const onShowSessions = () => {
    navigate("/sessions");
  };
  
  return (
    <div className="border-b border-[#444] flex items-center justify-between px-4 py-2">
      {/* Left section: Sidebar toggle and breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-[#333] rounded-md transition-colors"
        >
          {open ? (
            <ChevronLeft size={20} className="text-gray-400" />
          ) : (
            <Menu size={20} className="text-gray-400" />
          )}
        </button>
        <PathBreadCrumb path={currentPath} />
      </div>

      {/* Middle section: Action buttons */}
      <div className="flex items-center gap-2">
        {extraActions && extraActions}
        <Button 
          onClick={onRunCode}
          disabled={isExecuting}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center gap-2"
        >
          <Play size={16} className={isExecuting ? "animate-spin" : ""} />
          {isExecuting ? "Running..." : "Run Code"}
        </Button>
      </div>

      {/* Right section: Navigation and user profile */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onShowSessions}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Sessions
        </Button>
        <UserSection />
      </div>
    </div>
  );
}

TopNavBar.propTypes = {
  currentPath: PropTypes.array.isRequired,
  onRunCode: PropTypes.func.isRequired,
  isExecuting: PropTypes.bool,
  extraActions: PropTypes.node
};
