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
 * @param {string} props.activeSessionTab - Currently active tab identifier
 * @param {Function} props.onTabChange - Callback when tab selection changes
 * 
 * @example
 * ```jsx
 * <SessionTabs
 *   activeSessionTab="all"
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
import { useUIStore } from '@/stores';
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";



/** 
 * Tab order for animation direction calculation
 * @constant {string[]}
 */
const TAB_ORDER = ["all", "created", "invited", "favorites"];

export const SessionTabs = () => {
  const { activeSessionTab, setActiveSessionTab } = useUIStore();
  const [previousTab, setPreviousTab] = useState(activeSessionTab);
  const [direction, setDirection] = useState(0);
  
  /**
   * Effect to handle tab change direction for smooth animations
   */
  useEffect(() => {
    if (previousTab !== activeSessionTab) {
      const prevIndex = TAB_ORDER.indexOf(previousTab);
      const currentIndex = TAB_ORDER.indexOf(activeSessionTab);
      setDirection(prevIndex < currentIndex ? 1 : -1);
      setPreviousTab(activeSessionTab);
    }
  }, [activeSessionTab, previousTab]);
  
  /**
   * Handles tab selection change
   * @function
   * @param {string} value - Selected tab value
   */
  const handleTabChange = (value) => {
    setActiveSessionTab(value);
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
    <Tabs value={activeSessionTab} onValueChange={handleTabChange} className="w-full relative">
      <TabsList className="grid w-full grid-cols-4 relative overflow-hidden">
        <TabIndicator value={activeSessionTab} />
        
        <TabsTrigger value="all" className="gap-2 z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ 
              scale: activeSessionTab === "all" ? 1 : 0.9,
              opacity: activeSessionTab === "all" ? 1 : 0.8
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
              scale: activeSessionTab === "created" ? 1 : 0.9,
              opacity: activeSessionTab === "created" ? 1 : 0.8
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
              scale: activeSessionTab === "invited" ? 1 : 0.9,
              opacity: activeSessionTab === "invited" ? 1 : 0.8
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
              scale: activeSessionTab === "favorites" ? 1 : 0.9,
              opacity: activeSessionTab === "favorites" ? 1 : 0.8
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
        key={activeSessionTab}
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
 * No props needed - uses Zustand store directly
 */
SessionTabs.propTypes = {};