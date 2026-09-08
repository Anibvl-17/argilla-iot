import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import ProtectedRoute from "@components/ProtectedRoute";
import ReactDOM from "react-dom/client";
import Login from "@pages/Login";
import Root from "@pages/Root";
import HomeLayout from "@layouts/HomeLayout";
import Home from "@pages/Home";
import "./index.css";
import AdminKilns from "@pages/AdminKilns";
import AdminControllers from "@pages/AdminControllers";
import AdminUsers from "@pages/AdminUsers";
import { AdminHome } from "@pages/AdminHome";
import AuthLayout from "./layouts/AuthLayout";
import KilnDetails from "@pages/KilnDetails";
import SimulatorPanel from "./pages/SimulatorPanel";
import AdminKilnHistory from "@pages/AdminKilnHistory";
import Profile from "@pages/Profile";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    // errorElement: <Error404 />
    children: [
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <Login />,
          },
        ],
      },
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <HomeLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Home />,
          },
          {
            path: "kilns",
            element: <Home />,
          },
          {
            path: "kilns/:kilnId",
            element: <KilnDetails />,
          },
          {
            path: "simulator",
            element: <SimulatorPanel />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "management",
            element: (
              <ProtectedRoute allowedRoles={["ADMIN", "TECHNICIAN"]}>
                <Outlet />
              </ProtectedRoute>
            ),
            children: [
              {
                index: true,
                element: <AdminHome />,
              },
              {
                path: "kilns",
                element: <AdminKilns />,
              },
              {
                path: "kilns/:kilnId/history",
                element: <AdminKilnHistory />,
              },
              {
                path: "controllers",
                element: <AdminControllers />,
              },
              {
                path: "users",
                element: <AdminUsers />,
              },
            ],
          },
          {
            path: "admin",
            children: [
              { index: true, element: <Navigate to="/management" replace /> },
              {
                path: "users",
                element: <Navigate to="/management/users" replace />,
              },
              {
                path: "kilns",
                element: <Navigate to="/management/kilns" replace />,
              },
              {
                path: "controllers",
                element: <Navigate to="/management/controllers" replace />,
              },
              {
                path: "kilns/:kilnId/history",
                element: <Navigate to="/management/kilns" replace />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
