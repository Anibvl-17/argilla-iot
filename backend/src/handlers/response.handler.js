"use strict";

export const handleSuccess = (res, statusCode, message, data = null) => {
  res.status(statusCode).json({
    message,
    data,
    status: "Success",
  });
};

export const handleErrorClient = (
  res,
  statusCode,
  message,
  errorDetails = null,
  errorField = null,
  errorFields = null,
) => {
  res.status(statusCode).json({
    message,
    errorDetails,
    ...(errorField ? { errorField } : {}),
    ...(Array.isArray(errorFields) ? { errorFields } : {}),
    status: "Client error",
  });
};

export const handleErrorServer = (
  res,
  statusCode,
  message,
  errorDetails = null,
) => {
  res.status(statusCode).json({
    message,
    errorDetails,
    status: "Server error",
  });
};
