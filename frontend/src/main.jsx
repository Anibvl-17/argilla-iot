import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ProtectedRoute from "@components/ProtectedRoute";
import ReactDOM from "react-dom/client";
import Login from "@pages/Login";
import Root from "@pages/Root";
import Home from "@pages/Home";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    // errorElement: <Error404 />
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "/auth",
        element: <Login />,
      },
      {
        path: "/home",
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />,
);
