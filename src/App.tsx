import { router } from "@/config/router";
import { PeerProvider } from "@/contexts/PeerContext";
import { RouterProvider } from "react-router-dom";

function App() {
  return (
    <PeerProvider>
      <RouterProvider router={router} />
    </PeerProvider>
  );
}
export default App;
