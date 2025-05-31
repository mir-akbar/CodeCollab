import { Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export const SessionFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800 pt-6 mt-10 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand section */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">CodeCollab</h3>
            <p className="text-sm text-muted-foreground">
              A powerful platform for real-time code collaboration and knowledge sharing.
            </p>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="icon" className="bg-black rounded-full h-9 w-9">
                <Github className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="bg-black rounded-full h-9 w-9">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="bg-black rounded-full h-9 w-9">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Quick Links</h3>
            <nav>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-muted-foreground hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/workspace" className="text-sm text-muted-foreground hover:text-white transition-colors">
                    New Session
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-gray-500 cursor-not-allowed flex items-center">
                    Settings
                    <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded">Coming Soon</span>
                  </span>
                </li>
                <li>
                  <span className="text-sm text-gray-500 cursor-not-allowed flex items-center">
                    Help & Documentation
                    <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded">Coming Soon</span>
                  </span>
                </li>
              </ul>
            </nav>
          </div>

          {/* Status section */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Status</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-black">
                API: Operational
              </Badge>
              <Badge variant="outline" className="bg-black">
                WebSocket: Active
              </Badge>
              <Badge variant="outline" className="bg-black">
                Storage: Normal
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              Feedback? <a href="mailto:support@codehub.dev" className="underline hover:text-white">Contact us</a>
            </p>
          </div>
        </div>

        <Separator className="my-6 bg-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {currentYear} CodeCollab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SessionFooter;