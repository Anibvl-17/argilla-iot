import { useAuth } from "@context/AuthContext";
import { ROLES } from "../constants/user.constants";
import { Navigate } from "react-router-dom";

export default function Home() {
  const { user } = useAuth();

  if (user.role === ROLES.ADMIN) {
    return <Navigate to={"/admin"} replace />;
  }

  return (
    <div className="flex flex-col h-full text-white">
      <h1>Home</h1>
    </div>
  );
}
