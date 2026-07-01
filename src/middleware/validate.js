import { ApiError } from "../utils/apiError.js";

// Generic body-field validator: validate(['email', 'password'])
export const validate = (requiredFields = []) => (req, res, next) => {
  const missing = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ""
  );
  if (missing.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`);
  }
  next();
};
