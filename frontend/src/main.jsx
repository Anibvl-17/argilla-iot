import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import ProtectedRoute from "@components/ProtectedRoute";
import ReactDOM from "react-dom/client";
import Login from "@pages/Login";
import Root from "@pages/Root";
import HomeLayout from "@components/HomeLayout";
import Home from "@pages/Home";
import "./index.css";
import AdminKilns from "@pages/AdminKilns";
import AdminControllers from "@pages/AdminControllers";
import AdminUsers from "@pages/AdminUsers";
import { AdminHome } from "./pages/AdminHome";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    // errorElement: <Error404 />
    children: [
      {
        path: "auth",
        element: <Login />,
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
          },
          {
            path: "profile",
          },
          {
            path: "admin",
            element: (
              <ProtectedRoute allowedRoles="ADMIN">
                <Outlet />
              </ProtectedRoute>
            ),
            children: [
              {
                index: true,
                element: <AdminHome />
              },
              {
                path: "kilns",
                element: <AdminKilns />
              },
              {
                path: "controllers",
                element: <AdminControllers />
              },
              {
                path: "users",
                element: <AdminUsers />
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
