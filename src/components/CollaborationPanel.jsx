import { Bell } from 'lucide-react';
import ChatPanel from './ChatPanel';
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
      return <VideoPlaceholder />;
    default:
      return null;
  }
}

function VideoPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-[#333] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Video Chat Coming Soon</h3>
          <p className="text-gray-500 text-sm max-w-md">
            Video calling functionality will be implemented here. Stay tuned for real-time video collaboration!
          </p>
        </div>
      </div>
    </div>
  );
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