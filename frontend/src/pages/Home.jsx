import { Link } from "react-router-dom";
import { logout } from "@services/auth.service";
import { useAuth } from "@context/AuthContext";

const Home = () => {
  const { setUser } = useAuth();

  return (
    <div className="p-12">
      <h1>Home :)</h1>
      <Link
        className="underline"
        to={{
          pathname: "/",
        }}
        onClick={async () => {
          await logout();
          setUser(null);
        }}
      >
        Cerrar sesión
      </Link>
    </div>
  );
};

export default Home;
