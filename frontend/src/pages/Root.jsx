import { Outlet } from "react-router-dom";
import { AuthProvider } from "@context/AuthContext";
import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "@context/ThemeContext";

function ThemedRoot() {
  const { theme } = useTheme();
  return (
    <AuthProvider>
      <Toaster theme={theme} />
      <Outlet />
    </AuthProvider>
  );
}

export default function Root() {
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}
