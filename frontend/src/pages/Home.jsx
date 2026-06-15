import { Link } from "react-router-dom";
import { logout } from "../services/auth.service";

const Home = () => {
  return (
    <div>
      <h1>This is home!</h1>
      <Link
        className="underline"
        to={{
          pathname: "/",
        }}
        onClick={async () => {
          await logout();
        }}
      >
        Logout
      </Link>
    </div>
  );
};

export default Home;
