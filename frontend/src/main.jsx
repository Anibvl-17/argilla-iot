import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@components/ProtectedRoute";
import ReactDOM from "react-dom/client";
import Root from "@pages/Root";
import { ROLES } from "@constants/user.constants";
import "./index.css";

const AuthLayout = lazy(() => import("@layouts/AuthLayout"));
const HomeLayout = lazy(() => import("@layouts/HomeLayout"));
const Home = lazy(() => import("@pages/Home"));
const KilnDetails = lazy(() => import("@pages/KilnDetails"));
const SimulatorPanel = lazy(() => import("@pages/SimulatorPanel"));
const Profile = lazy(() => import("@pages/Profile"));
const SupportTickets = lazy(() => import("@pages/SupportTickets"));
const SupportTicketDetails = lazy(() => import("@pages/SupportTicketDetails"));
const AdminKilns = lazy(() => import("@pages/AdminKilns"));
const AdminControllers = lazy(() => import("@pages/AdminControllers"));
const AdminUsers = lazy(() => import("@pages/AdminUsers"));
const AdminKilnHistory = lazy(() => import("@pages/AdminKilnHistory"));
const AdminHome = lazy(() =>
  import("@pages/AdminHome").then((module) => ({
    default: module.AdminHome,
  })),
);

function RouteLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app text-content" role="status">
      Cargando…
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "auth",
        element: <AuthLayout />,
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
            element: (
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.CLIENT]}>
                <SimulatorPanel />
              </ProtectedRoute>
            ),
          },
          {
            path: "support",
            element: <SupportTickets />,
          },
          {
            path: "support/requests",
            element: (
              <ProtectedRoute allowedRoles={[ROLES.CLIENT]}>
                <SupportTickets />
              </ProtectedRoute>
            ),
          },
          {
            path: "support/assigned",
            element: (
              <ProtectedRoute allowedRoles={[ROLES.TECHNICIAN]}>
                <SupportTickets />
              </ProtectedRoute>
            ),
          },
          {
            path: "support/:ticketId",
            element: <SupportTicketDetails />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "management",
            element: (
              <ProtectedRoute
                allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN]}
              >
                <Outlet />
              </ProtectedRoute>
            ),
            children: [
              {
                index: true,
                element: (
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <AdminHome />
                  </ProtectedRoute>
                ),
              },
              {
                path: "kilns",
                element: <AdminKilns />,
              },
              {
                path: "kilns/:kilnId/history",
                element: (
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <AdminKilnHistory />
                  </ProtectedRoute>
                ),
              },
              {
                path: "controllers",
                element: <AdminControllers />,
              },
              {
                path: "users",
                element: (
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <AdminUsers />
                  </ProtectedRoute>
                ),
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
  <Suspense fallback={<RouteLoading />}>
    <RouterProvider router={router} />
  </Suspense>,
);
