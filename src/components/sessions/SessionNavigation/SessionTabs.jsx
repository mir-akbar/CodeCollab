/**
 * SessionTabs Component
 * 
 * Interactive tab navigation for session filtering with smooth animations.
 * Provides visual feedback for tab transitions and responsive design.
 * 
 * @component
 * @version 4.1.0 - Phase 4 Enhancement with Documentation
 * @since 1.0.0
 * 
 * @param {Object} props - Component properties
 * @param {string} props.activeTab - Currently active tab identifier
 * @param {Function} props.onTabChange - Callback when tab selection changes
 * 
 * @example
 * ```jsx
 * <SessionTabs
 *   activeTab="all"
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 * ```
 * 
 * Available tabs:
 * - "all": All sessions accessible to user
 * - "created": Sessions created by current user
 * - "invited": Sessions shared with current user
 * - "favorites": User's favorited sessions
 */
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Zap, Share2, Star } from "lucide-react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";



/** 
 * Tab order for animation direction calculation
 * @constant {string[]}
 */
const TAB_ORDER = ["all", "created", "invited", "favorites"];

export const SessionTabs = ({ activeTab = "all", onTabChange }) => {
  const [previousTab, setPreviousTab] = useState(activeTab);
  const [direction, setDirection] = useState(0);
  
  /**
   * Effect to handle tab change direction for smooth animations
   */
  useEffect(() => {
    if (previousTab !== activeTab) {
      const prevIndex = TAB_ORDER.indexOf(previousTab);
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      setDirection(prevIndex < currentIndex ? 1 : -1);
      setPreviousTab(activeTab);
    }
  }, [activeTab, previousTab]);
  
  /**
   * Handles tab selection change
   * @function
   * @param {string} value - Selected tab value
   */
  const handleTabChange = (value) => {
    onTabChange(value);
  };
  
  /**
   * Animated indicator component for active tab
   * @component
   * @param {Object} props - Component props
   * @param {string} props.value - Current active tab value
   * @returns {JSX.Element} Animated tab indicator
   */
  const TabIndicator = ({ value }) => {
    return (
      <motion.div
        className="absolute bottom-0 left-0 h-[3px] bg-primary rounded-full"
        style={{ width: `calc(100% / 4)` }}
        initial={false}
        animate={{
          x: `calc(${TAB_ORDER.indexOf(value)} * 100%)`,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        aria-hidden="true"
      />
    );
  };

  // PropTypes for internal component
  TabIndicator.propTypes = {
    value: PropTypes.string.isRequired
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full relative">
      <TabsList className="grid w-full grid-cols-4 relative overflow-hidden">
        <TabIndicator value={activeTab} />
        
        <TabsTrigger value="all" className="gap-2 z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ 
              scale: activeTab === "all" ? 1 : 0.9,
              opacity: activeTab === "all" ? 1 : 0.8
            }}
            className="flex items-center gap-2"
          >
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">All</span>
            <span className="inline sm:hidden">All</span>
          </motion.div>
        </TabsTrigger>
        
        <TabsTrigger value="created" className="gap-2 z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ 
              scale: activeTab === "created" ? 1 : 0.9,
              opacity: activeTab === "created" ? 1 : 0.8
            }}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Created by Me</span>
            <span className="inline sm:hidden">Mine</span>
          </motion.div>
        </TabsTrigger>
        
        <TabsTrigger value="invited" className="gap-2 z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ 
              scale: activeTab === "invited" ? 1 : 0.9,
              opacity: activeTab === "invited" ? 1 : 0.8
            }}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Shared with Me</span>
            <span className="inline sm:hidden">Shared</span>
          </motion.div>
        </TabsTrigger>
        
        <TabsTrigger value="favorites" className="gap-2 z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ 
              scale: activeTab === "favorites" ? 1 : 0.9,
              opacity: activeTab === "favorites" ? 1 : 0.8
            }}
            className="flex items-center gap-2"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Favorites</span>
            <span className="inline sm:hidden">Favs</span>
          </motion.div>
        </TabsTrigger>
      </TabsList>
      
      <motion.div
        key={activeTab}
        initial={{ 
          x: direction * 20,
          opacity: 0
        }}
        animate={{ 
          x: 0,
          opacity: 1
        }}
        exit={{ 
          x: direction * -20,
          opacity: 0
        }}
        transition={{ 
          duration: 0.2,
          ease: "easeInOut" 
        }}
        className="w-full"
      >
        {/* This div will animate the content when tabs change */}
      </motion.div>
    </Tabs>
  );
};

/**
 * PropTypes validation for SessionTabs component
 * 
 * @typedef {Object} SessionTabsProps
 * @property {string} activeTab - Currently active tab
 * @property {Function} onTabChange - Tab change callback
 */
SessionTabs.propTypes = {
  /** 
   * Currently active tab identifier.
   * Must be one of: "all", "created", "invited", "favorites"
   * @type {string}
   * @required
   */
  activeTab: PropTypes.oneOf(["all", "created", "invited", "favorites"]).isRequired,
  
  /** 
   * Callback function when tab selection changes.
   * Receives the new tab value as parameter.
   * @type {Function}
   * @required
   */
  onTabChange: PropTypes.func.isRequired
};