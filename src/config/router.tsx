import { HomePage } from "@/pages/HomePage";
import SessionPage from "@/pages/SessionPage";
import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/session/:sessionId",
    element: <SessionPage />,
  },
  {
    path: "*",
    element: <Navigate to="/" />,
  },
]);
