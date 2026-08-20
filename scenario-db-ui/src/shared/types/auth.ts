export interface LoginRequest {
  login: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  login: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
