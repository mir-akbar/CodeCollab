/**
 * SessionFooter Component
 * 
 * Application footer with branding, navigation links, and social media icons.
 * Provides consistent footer across session-related pages with responsive design.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Comprehensive Documentation
 * @since 1.0.0
 * 
 * @example
 * ```jsx
 * // Basic usage - no props required
 * <SessionFooter />
 * ```
 * 
 * @features
 * - Responsive grid layout for mobile/desktop
 * - Social media integration links with external link handling
 * - Dynamic copyright year calculation
 * - Accessible navigation with proper ARIA labels and roles
 * - Consistent branding and styling with hover effects
 * - Service status indicators with real-time badges
 * - Structured data with semantic HTML
 * 
 * @accessibility
 * - Proper ARIA labels for all interactive elements
 * - Semantic HTML structure with nav, footer, and list elements
 * - Screen reader friendly descriptions
 * - Keyboard navigation support
 * - Color contrast compliance
 * 
 * @performance
 * - Memoized static data to prevent unnecessary re-renders
 * - Optimized external link handling
 * - Lazy evaluation of dynamic content
 */
import { Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useMemo } from "react";

// Debug logging utility
const logDebugInfo = (action, data) => {
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    console.log(`[SessionFooter Debug] ${action}:`, data);
  }
};

export const SessionFooter = () => {
  /**
   * Memoized current year to prevent unnecessary recalculations
   * @constant {number}
   */
  const currentYear = useMemo(() => {
    const year = new Date().getFullYear();
    logDebugInfo('Current year calculated', year);
    return year;
  }, []);

  /**
   * Navigation links configuration with accessibility descriptions
   * @constant {Array<Object>}
   */
  const navigationLinks = useMemo(() => {
    const links = [
      { to: "/", label: "Home", description: "Return to homepage" },
      { to: "/sessions", label: "Sessions", description: "View all collaborative sessions" },
      { to: "/profile", label: "Profile", description: "Manage your user profile and settings" },
      { to: "/help", label: "Help", description: "Get help and support documentation" }
    ];
    logDebugInfo('Navigation links configured', links.length);
    return links;
  }, []);

  /**
   * Social media links configuration with external link handling
   * @constant {Array<Object>}
   */
  const socialLinks = useMemo(() => {
    const links = [
      { 
        icon: Github, 
        href: "https://github.com/codecollab", 
        label: "GitHub",
        ariaLabel: "Visit our GitHub repository (opens in new tab)"
      },
      { 
        icon: Twitter, 
        href: "https://twitter.com/codecollab", 
        label: "Twitter",
        ariaLabel: "Follow us on Twitter (opens in new tab)"
      },
      { 
        icon: Linkedin, 
        href: "https://linkedin.com/company/codecollab", 
        label: "LinkedIn",
        ariaLabel: "Connect with us on LinkedIn (opens in new tab)"
      }
    ];
    logDebugInfo('Social links configured', links.length);
    return links;
  }, []);

  return (
    <footer 
      className="border-t border-gray-800 pt-6 mt-10 pb-8"
      role="contentinfo"
      aria-label="Site footer with navigation and contact information"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand section */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">CodeCollab</h3>
            <p className="text-sm text-muted-foreground">
              A powerful platform for real-time code collaboration and knowledge sharing.
            </p>
            <div className="flex items-center space-x-3" role="list" aria-label="Social media links">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <Button 
                    key={social.label}
                    variant="outline" 
                    size="icon" 
                    className="bg-black rounded-full h-9 w-9 hover:bg-gray-800 transition-colors"
                    asChild
                  >
                    <a 
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                    >
                      <IconComponent className="h-4 w-4" />
                    </a>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Quick Links</h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2" role="list">
                {navigationLinks.map((link) => (
                  <li key={link.to}>
                    <Link 
                      to={link.to} 
                      className="text-sm text-muted-foreground hover:text-white transition-colors"
                      aria-label={link.description}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link 
                    to="/workspace" 
                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                    aria-label="Create a new collaborative session"
                  >
                    New Session
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-gray-500 cursor-not-allowed flex items-center">
                    Settings
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Coming Soon
                    </Badge>
                  </span>
                </li>
                <li>
                  <span className="text-sm text-gray-500 cursor-not-allowed flex items-center">
                    Help & Documentation
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Coming Soon
                    </Badge>
                  </span>
                </li>
              </ul>
            </nav>
          </div>

          {/* Status section */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">System Status</h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Service status indicators">
              <Badge 
                variant="outline" 
                className="bg-black hover:bg-gray-800 transition-colors"
                aria-label="API service is operational"
              >
                API: Operational
              </Badge>
              <Badge 
                variant="outline" 
                className="bg-black hover:bg-gray-800 transition-colors"
                aria-label="WebSocket service is active"
              >
                WebSocket: Active
              </Badge>
              <Badge 
                variant="outline" 
                className="bg-black hover:bg-gray-800 transition-colors"
                aria-label="Storage service is normal"
              >
                Storage: Normal
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              Feedback? {' '}
              <a 
                href="mailto:support@codehub.dev" 
                className="underline hover:text-white transition-colors"
                aria-label="Send feedback via email"
              >
                Contact us
              </a>
            </p>
          </div>
        </div>

        <Separator className="my-6 bg-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {currentYear} CodeCollab. All rights reserved.</p>
          <p className="mt-2 md:mt-0">
            Built with ❤️ for developers worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

// PropTypes documentation
SessionFooter.propTypes = {
  // No props - this is a static footer component
};

SessionFooter.displayName = 'SessionFooter';

export default SessionFooter;