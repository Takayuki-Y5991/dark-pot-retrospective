import { router } from "@/config/router";
import { PeerProvider } from "@/contexts/PeerContext";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

function App() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const cleanupData = sessionStorage.getItem("session_cleanup");
        if (cleanupData) {
          try {
            const { sessionId } = JSON.parse(cleanupData);
            console.log(
              `Tab became visible, checking cleanup for session: ${sessionId}`
            );
          } catch (error) {
            console.error("Error handling visibility change cleanup:", error);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <PeerProvider>
      <RouterProvider router={router} />
    </PeerProvider>
  );
}
export default App;
