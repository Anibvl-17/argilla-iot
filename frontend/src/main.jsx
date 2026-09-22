import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "@components/ProtectedRoute";
import ReactDOM from "react-dom/client";
import Root from "@pages/Root";
import { ROLES } from "@constants/user.constants";
import { lazyWithRefresh } from "./utils/lazyWithRefresh";
import "./index.css";

const AuthLayout = lazyWithRefresh(() => import("@layouts/AuthLayout"), "auth-layout");
const HomeLayout = lazyWithRefresh(() => import("@layouts/HomeLayout"), "home-layout");
const Home = lazyWithRefresh(() => import("@pages/Home"), "home");
const KilnDetails = lazyWithRefresh(
  () => import("@pages/KilnDetails"),
  "kiln-details",
);
const Profile = lazyWithRefresh(() => import("@pages/Profile"), "profile");
const SupportTickets = lazyWithRefresh(
  () => import("@pages/SupportTickets"),
  "support-tickets",
);
const SupportTicketDetails = lazyWithRefresh(
  () => import("@pages/SupportTicketDetails"),
  "support-ticket-details",
);
const AdminKilns = lazyWithRefresh(
  () => import("@pages/AdminKilns"),
  "admin-kilns",
);
const AdminControllers = lazyWithRefresh(
  () => import("@pages/AdminControllers"),
  "admin-controllers",
);
const AdminUsers = lazyWithRefresh(
  () => import("@pages/AdminUsers"),
  "admin-users",
);
const AdminKilnHistory = lazyWithRefresh(
  () => import("@pages/AdminKilnHistory"),
  "admin-kiln-history",
);
const AdminHome = lazyWithRefresh(
  () =>
    import("@pages/AdminHome").then((module) => ({
      default: module.AdminHome,
    })),
  "admin-home",
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
