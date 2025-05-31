
// import { TopNavBar } from "@/components/TopNavBar";
// import  SessionManager from "@/components/sessions/SessionManager";
// import { useEffect, useState } from "react";
// import { CognitoUserPool } from "amazon-cognito-identity-js";
// import { cognitoConfig } from "@/config/cognito";

// export default function SessionsPage() {
//   const [userEmail, setUserEmail] = useState("");
  
//   useEffect(() => {
//     const userPool = new CognitoUserPool(cognitoConfig);
//     const cognitoUser = userPool.getCurrentUser();
    
//     if (cognitoUser) {
//       cognitoUser.getSession((err) => {
//         if (!err) {
//           cognitoUser.getUserAttributes((err, attributes) => {
//             if (!err) {
//               const emailAttr = attributes.find(attr => attr.Name === "email");
//               setUserEmail(emailAttr?.Value || "");
//             }
//           });
//         }
//       });
//     }
//   }, []);

//   return (
//     <div className="min-h-screen bg-[#121212] text-gray-200 flex flex-col focus:outline-none">
//       <TopNavBar />
//       <div className="container mx-auto px-4 py-8 flex-1">
//         <h1 className="text-3xl font-bold mb-8">Collaboration Sessions</h1>
//         {userEmail ? (
//           <SessionManager userEmail={userEmail} />
//         ) : (
//           <div className="text-center py-12">
//             <p className="text-lg">Loading sessions...</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import { SessionManager } from "@/components/sessions/SessionManager";
import SessionManagerTopNavBar from "@/components/sessions/SessionManagerTopNavBar";

export default function SessionsPage() {
  return (
    <div>
      <SessionManagerTopNavBar />
      <SessionManager />
    </div>
  );
}
