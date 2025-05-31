import { useEffect, useState } from 'react';
import { Users, LogOut, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { isAuthenticated, logout } from '@/utils/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from "../common/Constant";
import CryptoJS from 'crypto-js';
import axios from "axios";

const SECRET_KEY = "f9a8b7c6d5e4f3a2b1c0d9e8f7g6h5i4j3k2l1m0n9o8p7q6";

export function UserSection() {
  const navigate = useNavigate();
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [users, setUsers] = useState([]);
  const session = searchParams.get("session");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.post(`${API_URL}/manage_session/active-users`, {
          session_id: session
        });

        const emails = response.data.map(user => user.email);
        setUsers(emails);
      } catch (error) {
        console.error("Error fetching active users:", error);
      }
    };
  
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [session]);
  

  return (
    <div className="flex items-center gap-4">
      <UsersDialog users={users} onCopyLink={handleCopyLink} />
      <AuthButton handleLogout={handleLogout} navigate={navigate} />
    </div>
  );
}

function UsersDialog({ users, onCopyLink }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-[#333] p-2 rounded-md">
          <Users size={18} className="text-gray-400" />
          <div className="flex -space-x-2">
            {users.length > 0 ? (
              users.map(user => {
                const trimmedEmail = user.slice(0, 1);
                return (
                  <div key={user} className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm">
                    {trimmedEmail.toUpperCase()}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">No active users</p>
            )}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="bg-[#1e1e1e] text-gray-300 border-[#444]">
        <DialogHeader>
          <DialogTitle>Collaboration</DialogTitle>
        </DialogHeader>
        <UsersDialogContent onCopyLink={onCopyLink} />
      </DialogContent>
    </Dialog>
  );
}

function AuthButton({ handleLogout, navigate }) {
  const isLoggedIn = isAuthenticated();

  return isLoggedIn ? (
    <Button 
      onClick={handleLogout}
      variant="outline" 
      className="border-red-500 text-red-500 hover:bg-red-500/10 gap-2"
    >
      <LogOut size={16} />
      Logout
    </Button>
  ) : (
    <Button 
      onClick={() => navigate('/login')}
      variant="outline" 
      className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
    >
      Login
    </Button>
  );
}

function UsersDialogContent({ onCopyLink }) {
  return (
    <div className="space-y-4">
      <ActiveUsersList />
      {/* <ShareSession onCopyLink={onCopyLink} /> */}
    </div>
  );
}

function encryptData(text) {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decryptData(cipherText) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    return "";
  }
}

function ActiveUsersList() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [accessLevel, setAccessLevel] = useState("");
  const [shareableLink, setShareableLink] = useState(window.location.href);
  const loggedInUser = localStorage.getItem("email");

  const encryptedUser = searchParams.get("user");
  const session = searchParams.get("session");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.post(`${API_URL}/manage_session/active-users`, {
          session_id: session
        });

        const emails = response.data.map(user => user.email);
        setUsers(emails);
      } catch (error) {
        console.error("Error fetching active users:", error);
      }
    };
  
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (selectedUser && accessLevel) {
      const encryptedUser = encodeURIComponent(encryptData(selectedUser));
      const encryptedAccess = encodeURIComponent(encryptData(accessLevel));
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("user", encryptedUser);
      currentUrl.searchParams.set("access", encryptedAccess);
      setShareableLink(currentUrl.toString());
    }
  }, [selectedUser, accessLevel]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Active Users</h3>
      <div className="space-y-2">
        {users.length > 0 ? (
          users.map(user => (
            <div key={user} className="flex items-center gap-2 p-2 rounded bg-[#2d2d2d]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-blue-500">
                {user.charAt(0).toUpperCase()}
              </div>
              <span>{user.split("@")[0]}</span>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No active users</p>
        )}
      </div>
      {!encryptedUser && (
        <>
          <select className="mt-2 p-2 bg-[#2d2d2d] text-white border border-[#444] rounded w-full" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">Select an active user</option>
            {users.filter(user => user !== loggedInUser).map(user => (
              <option key={user} value={user}>{user.split("@")[0]}</option>
            ))}
          </select>
          <select className="mt-2 p-2 bg-[#2d2d2d] text-white border border-[#444] rounded w-full" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
            <option value="">Select access level</option>
            <option value="edit">Edit</option>
            <option value="view">View</option>
          </select>
          <ShareSession shareableLink={shareableLink} />
        </>
      )}
    </div>
  );

}


function ShareSession({ shareableLink }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Share Session</h3>
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={shareableLink} 
          readOnly 
          className="flex-1 bg-[#2d2d2d] border border-[#444] rounded p-2 text-sm"
        />
        <Button 
          onClick={() => navigator.clipboard.writeText(shareableLink)}
          variant="outline" 
          size="icon"
        >
          <Copy size={16} />
        </Button>
      </div>
    </div>
  );
}
