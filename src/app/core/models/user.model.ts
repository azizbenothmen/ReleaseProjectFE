export interface User {
  username: string;
  email: string;
  roles: string[];
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface LoginResponse {
  status: string;
}
