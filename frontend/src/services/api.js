import axios from "axios";

export const API_URL = "http://localhost:5000/api";

export const COURSE_ID =
  "783a94a8-c8de-4509-be90-109a84552ea0";

export const MODULE_ID =
  "7b128e46-59d8-409c-a349-47959cbdfb58";

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export default axios;