import { Bell } from 'lucide-react';
import VideoPanel from './VideoPanel';
import ChatPanel from './ChatPanel';
import PropTypes from 'prop-types';

export function CollaborationPanel({ activeTab, setActiveTab, sessionId }) {
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border border-[#444] mx-2 rounded-xl overflow-hidden">
      <div className="h-12 border-b border-[#444] flex items-center justify-between px-4">
        <span className="text-gray-300">Collaboration</span>
        <button className="p-2 hover:bg-[#333] rounded-md">
          <Bell size={18} className="text-gray-400" />
        </button>
      </div>

      <CollaborationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        <CollaborationContent activeTab={activeTab} sessionId={sessionId} />
      </div>
    </div>
  );
}

function CollaborationTabs({ activeTab, setActiveTab }) {
  const tabs = ['chat', 'video', 'settings'];
  
  return (
    <div className="border-b border-[#444]">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-gray-300 capitalize ${
              activeTab === tab ? 'border-b-2 border-blue-500' : ''
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function CollaborationContent({ activeTab, sessionId }) {
  switch (activeTab) {
    case 'chat':
      return <ChatPanel sessionId={sessionId} />;
    case 'video':
      return <VideoPanel sessionId={sessionId} />;
    case 'settings':
      return <SettingsPanel sessionId={sessionId} />;
    default:
      return null;
  }
}


function SettingsPanel({ sessionId }) {
  return (
    <div className="flex-1 p-4">
      <h3 className="text-lg font-semibold mb-4">Collaboration Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Notification Preferences</label>
          <select className="w-full bg-[#2d2d2d] border border-[#444] rounded-md p-2 text-gray-200">
            <option>All messages</option>
            <option>Mentions only</option>
            <option>None</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Theme</label>
          <select className="w-full bg-[#2d2d2d] border border-[#444] rounded-md p-2 text-gray-200">
            <option>Dark</option>
            <option>Light</option>
            <option>System</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// PropTypes for components
CollaborationPanel.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  sessionId: PropTypes.string
};

CollaborationTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired
};

CollaborationContent.propTypes = {
  activeTab: PropTypes.string.isRequired,
  sessionId: PropTypes.string
};

SettingsPanel.propTypes = {
  sessionId: PropTypes.string
};