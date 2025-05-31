import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

const CodeCollabWelcome = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-black p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="max-w-lg w-full"
      >
        <Card className="shadow-lg bg-white rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Welcome to <span className="text-blue-600">Code Collaboration</span>
          </h1>
          <p className="text-gray-600">
            To access this workspace, please request permission from the admin.
            Share your content professionally and collaborate seamlessly.
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default CodeCollabWelcome;
