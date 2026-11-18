import api from "./client";

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export async function changePassword(
  data: ChangePasswordRequest
): Promise<{ message: string }> {
  const response = await api.post(
    "/auth/change-password",
    data
  );

  return response.data;
}