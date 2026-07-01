import { Outlet } from "react-router-dom";
import { AuthProvider } from "@context/AuthContext";
import { Toaster } from "sonner";

function Root() {
  return (
    <AuthProvider>
      <Toaster theme="dark"/>
      <Outlet />
    </AuthProvider>
  )
}

export default Root;