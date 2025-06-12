/**
 * AccessLevelBadge Component
 * 
 * Displays user access levels and roles with visual indicators and icons.
 * Supports hierarchical role display with priority-based rendering.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Comprehensive Documentation
 * @since 1.0.0
 * 
 * @example
 * ```jsx
 * // Basic access level
 * <AccessLevelBadge access="editor" />
 * 
 * // With role override
 * <AccessLevelBadge access="viewer" role="admin" />
 * 
 * // Creator flag (highest priority)
 * <AccessLevelBadge access="editor" isCreator={true} />
 * 
 * // Complete configuration
 * <AccessLevelBadge 
 *   access="viewer" 
 *   role="admin" 
 *   isCreator={false}
 *   showTooltip={true}
 * />
 * ```
 * 
 * @features
 * - Hierarchical role display (role > isCreator > access)
 * - Visual icons for each access level
 * - Consistent color coding and styling
 * - Accessibility support with ARIA labels
 * - Backward compatibility with legacy prop names
 * - Hover effects and transitions
 * - Optional tooltip functionality
 * 
 * @hierarchy
 * 1. Owner (purple) - Session creator or explicit owner role
 * 2. Admin (red) - Administrative privileges
 * 3. Editor (blue) - Can modify content
 * 4. Viewer (gray) - Read-only access
 * 
 * @accessibility
 * - Proper ARIA labels describing access levels
 * - Color-blind friendly with both color and icons
 * - Screen reader compatible descriptions
 * - Keyboard navigation support
 */
import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Edit2, ShieldAlert } from "lucide-react";
import PropTypes from "prop-types";
import { useMemo } from "react";

// Debug logging utility
// const logDebugInfo = (action, data) => {
//   if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
//     console.log(`[AccessLevelBadge Debug] ${action}:`, data);
//   }
// };

/**
 * AccessLevelBadge Component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.access="viewer"] - Base access level (viewer, editor, admin, owner)
 * @param {string|null} [props.role=null] - Explicit role override (takes priority over access)
 * @param {boolean} [props.isCreator=false] - Whether user is the session creator
 * @param {boolean} [props.showTooltip=false] - Whether to show detailed tooltip
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element} Rendered access level badge
 */
export const AccessLevelBadge = ({ 
  access = "viewer", 
  role = null, 
  isCreator = false, 
  showTooltip = false,
  className = ""
}) => {
  /**
   * Determine the display role based on priority hierarchy
   * Priority: role > isCreator > access
   * @type {string}
   */
  const displayRole = useMemo(() => {
    const result = role || (isCreator ? "owner" : null) || access;
    // logDebugInfo('Role calculation', {
    //   input: { access, role, isCreator },
    //   output: result
    // });
    return result;
  }, [access, role, isCreator]);

  /**
   * Get badge configuration based on display role
   * @type {Object}
   */
  const badgeConfig = useMemo(() => {
    const configs = {
      owner: {
        variant: "default",
        className: "bg-purple-600 hover:bg-purple-700 border-purple-500",
        icon: Crown,
        label: "Owner",
        description: "Session owner with full control",
        ariaLabel: "Owner access level - full control over session"
      },
      admin: {
        variant: "default", 
        className: "bg-red-600 hover:bg-red-700 border-red-500",
        icon: ShieldAlert,
        label: "Admin", 
        description: "Administrative privileges",
        ariaLabel: "Admin access level - administrative privileges"
      },
      editor: {
        variant: "default",
        className: "bg-blue-600 hover:bg-blue-700 border-blue-500", 
        icon: Edit2,
        label: "Editor",
        description: "Can edit and modify content",
        ariaLabel: "Editor access level - can modify content"
      },
      edit: { // Backward compatibility
        variant: "default",
        className: "bg-blue-600 hover:bg-blue-700 border-blue-500",
        icon: Edit2, 
        label: "Editor",
        description: "Can edit and modify content",
        ariaLabel: "Editor access level - can modify content"
      },
      viewer: {
        variant: "outline",
        className: "border-gray-500 bg-transparent text-gray-300 hover:bg-gray-800",
        icon: Eye,
        label: "Viewer", 
        description: "Read-only access",
        ariaLabel: "Viewer access level - read-only access"
      },
      view: { // Backward compatibility
        variant: "outline",
        className: "border-gray-500 bg-transparent text-gray-300 hover:bg-gray-800",
        icon: Eye,
        label: "Viewer",
        description: "Read-only access", 
        ariaLabel: "Viewer access level - read-only access"
      }
    };

    const config = configs[displayRole] || configs.viewer;
    // logDebugInfo('Badge config selected', { displayRole, config: config.label });
    return config;
  }, [displayRole]);

  const IconComponent = badgeConfig.icon;

  return (
    <Badge 
      variant={badgeConfig.variant}
      className={`transition-colors duration-200 ${badgeConfig.className} ${className}`}
      aria-label={badgeConfig.ariaLabel}
      title={showTooltip ? badgeConfig.description : undefined}
    >
      <IconComponent className="h-3 w-3 mr-1" aria-hidden="true" />
      {badgeConfig.label}
    </Badge>
  );
};

/**
 * PropTypes for AccessLevelBadge component
 * Comprehensive validation with detailed descriptions
 */
AccessLevelBadge.propTypes = {
  /** 
   * Base access level for the user
   * @type {string}
   * @default "viewer"
   */
  access: PropTypes.oneOf(['viewer', 'view', 'editor', 'edit', 'admin', 'owner']),
  
  /** 
   * Explicit role that overrides access level
   * @type {string|null}
   * @default null
   */
  role: PropTypes.oneOf(['viewer', 'view', 'editor', 'edit', 'admin', 'owner']),
  
  /** 
   * Whether the user is the session creator (becomes owner)
   * @type {boolean}
   * @default false
   */
  isCreator: PropTypes.bool,
  
  /** 
   * Whether to show detailed tooltips on hover
   * @type {boolean}
   * @default false
   */
  showTooltip: PropTypes.bool,
  
  /** 
   * Additional CSS classes to apply
   * @type {string}
   * @default ""
   */
  className: PropTypes.string
};

AccessLevelBadge.displayName = 'AccessLevelBadge';

export default AccessLevelBadge;