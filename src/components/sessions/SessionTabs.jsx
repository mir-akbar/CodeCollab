// components/sessions/SessionTabs.jsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Zap, Share2, Star } from "lucide-react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export const SessionTabs = ({ activeTab, onTabChange }) => {
  const [previousTab, setPreviousTab] = useState(activeTab);
  const [direction, setDirection] = useState(0);
  
  const tabOrder = ["all", "created", "invited", "favorites"];
  
  useEffect(() => {
    if (previousTab !== activeTab) {
      const prevIndex = tabOrder.indexOf(previousTab);
      const currentIndex = tabOrder.indexOf(activeTab);
      setDirection(prevIndex < currentIndex ? 1 : -1);
      setPreviousTab(activeTab);
    }
  }, [activeTab, previousTab]);
  
  const handleTabChange = (value) => {
    onTabChange(value);
  };
  
  const TabIndicator = ({ value }) => {
    return (
      <motion.div
        className="absolute bottom-0 left-0 h-[3px] bg-primary rounded-full"
        style={{ width: `calc(100% / 4)` }}
        initial={false}
        animate={{
          x: `calc(${tabOrder.indexOf(value)} * 100%)`,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      />
    );
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

SessionTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired
};