import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import cookies from "js-cookie";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = cookies.get("jwt-auth");
    const storedUser = sessionStorage.getItem("user");

    if (token && storedUser) {
      try {
        const decoded = jwtDecode(token);

        if (decoded.exp * 1000 > Date.now()) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setUser(JSON.parse(storedUser));
        } else {
          cookies.remove("jwt-auth");
          sessionStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Error al decodificar datos", error);
        cookies.remove("jwt-auth");
        sessionStorage.removeItem("user");
      }
    }

    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth() debe ser usado dentro de un AuthProvider");
  }

  return context;
};
