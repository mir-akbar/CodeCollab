import { Bell } from 'lucide-react';
import ChatPanel from './ChatPanel';
import VideoCallPanel from './video/VideoCallPanel';
import PropTypes from 'prop-types';
import { useUIStore } from '@/stores';

export function CollaborationPanel({ sessionId }) {
  const { activeCollaborationTab, setActiveCollaborationTab } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border border-[#444] mx-2 rounded-xl overflow-hidden">
      <div className="h-12 border-b border-[#444] flex items-center justify-between px-4">
        <span className="text-gray-300">Collaboration</span>
        <button className="p-2 hover:bg-[#333] rounded-md">
          <Bell size={18} className="text-gray-400" />
        </button>
      </div>

      <CollaborationTabs activeTab={activeCollaborationTab} setActiveTab={setActiveCollaborationTab} />
      <div className="flex-1 overflow-hidden">
        <CollaborationContent activeTab={activeCollaborationTab} sessionId={sessionId} />
      </div>
    </div>
  );
}

function CollaborationTabs({ activeTab, setActiveTab }) {
  const tabs = ['chat', 'video'];
  
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
      return <VideoCallPanel sessionId={sessionId} />;
    default:
      return null;
  }
}

// PropTypes for components
CollaborationPanel.propTypes = {
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