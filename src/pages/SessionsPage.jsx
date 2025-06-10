
import { SessionManager, SessionCardSkeleton, SessionManagerTopNavBar } from "@/components/sessions/";
import { useEffect, useState } from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import { cognitoConfig } from "@/config/cognito";

export default function SessionsPage() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const userPool = new CognitoUserPool(cognitoConfig);
    const cognitoUser = userPool.getCurrentUser();

    if (cognitoUser) {
      cognitoUser.getSession((err) => {
        if (!err) {
          cognitoUser.getUserAttributes((err, attributes) => {
            if (!err) {
              const emailAttr = attributes.find(attr => attr.Name === "email");
              setUserEmail(emailAttr?.Value || "");
            }
          });
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 flex flex-col focus:outline-none">
      <SessionManagerTopNavBar />
      {userEmail ? (
        <SessionManager userEmail={userEmail} />
      ) : (
        <div className="flex flex-col flex-1">
          <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl flex-1">
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex-1">
                <div className="h-9 bg-gray-800 rounded-lg animate-pulse w-64 mb-2" />
                <div className="h-5 bg-gray-800 rounded-lg animate-pulse w-80" />
              </div>
              
              <div className="flex gap-3 flex-shrink-0 w-full lg:w-auto justify-end">
                <div className="h-10 bg-gray-800 rounded-lg animate-pulse w-20" />
                <div className="h-10 bg-gray-800 rounded-lg animate-pulse w-32" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="space-y-6 mt-8">
              {/* Filters skeleton */}
              <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              
              {/* Tabs skeleton */}
              <div className="h-12 bg-gray-800 rounded-lg animate-pulse" />
              
              {/* Session cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <SessionCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
