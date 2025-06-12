import { Video } from "lucide-react";

export default function VideoPanel() {
  return (
    <div className="flex flex-col h-full overflow-auto py-2 px-2">
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Video calling feature is currently being upgraded</p>
          <p className="text-xs mt-2">WebRTC integration will be available soon</p>
        </div>
      </div>
    </div>
  );
}
