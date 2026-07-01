import { useState } from "react";

const useAuthForm = () => {
  const [error, setError] = useState("");

  const errorData = (error) => {
    let message;

    if (error) {
      if (error.data?.errorDetails?.lenght > 1) {
        message = error.data.errorDetails[0];
      } else if (error.data?.errorDetails) {
        message = error.data.errorDetails;
      } else {
        message = error.message;
      }

      setError(message);
      console.error(error);
    }
  };

  const handleInputChange = () => {
    setError("");
  };

  return {
    error,
    errorData,
    handleInputChange,
  };
};

export default useAuthForm;
