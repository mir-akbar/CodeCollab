import { ChevronLeft, Menu, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSection } from './UserSection';
import { PathBreadCrumb } from './PathBreadCrumb';
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';

export function TopNavBar({ toggleSidebar, open, currentPath, onRunCode }) {
  const navigate = useNavigate();
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
      <div className="flex items-center">
        <Button 
          onClick={onRunCode}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Play size={16} />
          Run Code
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
        <Button
          onClick={() => navigate("/user-profile-test")}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          User Profile
        </Button>
        <UserSection />
      </div>
    </div>
  );
}

TopNavBar.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  currentPath: PropTypes.array.isRequired,
  onRunCode: PropTypes.func.isRequired
};
