import { useState } from "react";
import { clearFormError, normalizeFormError } from "../utils/formError";

const useAuthForm = () => {
  const [error, setError] = useState(null);

  const errorData = (source, defaultField = null) => {
    setError(normalizeFormError(source, defaultField));
  };

  const handleInputChange = (event) => {
    const changedField = event?.target?.name;
    if (!changedField) {
      setError(null);
      return;
    }
    setError((current) => clearFormError(current, changedField));
  };

  return {
    error,
    errorData,
    handleInputChange,
  };
};

export default useAuthForm;
