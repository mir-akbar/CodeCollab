import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export const SessionCardSkeleton = () => {
  return (
    <motion.div
      className="border rounded-lg p-4 shadow-sm space-y-3 bg-card hover:shadow-md transition-shadow h-[240px] flex flex-col"
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" /> {/* Title */}
            <Skeleton className="h-5 w-20 rounded-full shrink-0" /> {/* Creator badge */}
          </div>
          <Skeleton className="h-10 w-full mt-1" /> {/* Description with fixed height */}
        </div>
        <div className="self-start shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" /> {/* Favorite button */}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20 rounded-full" /> {/* Access badge */}
        <Skeleton className="h-6 w-32 rounded-full" /> {/* Participants badge */}
        <Skeleton className="h-6 w-28 rounded-full" /> {/* Date badge */}
      </div>

      {/* Participants Preview */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex -space-x-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full border-2 border-background" />
          ))}
        </div>
        <Skeleton className="h-9 w-20 rounded-md" /> {/* Invite button */}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-between mt-2">
        <Skeleton className="h-10 w-full rounded-md" /> {/* Join button */}
        <Skeleton className="h-10 w-full rounded-md" /> {/* Delete/Leave button */}
      </div>
    </motion.div>
  );
};

export default SessionCardSkeleton; 