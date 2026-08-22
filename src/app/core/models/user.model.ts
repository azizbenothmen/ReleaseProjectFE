import { CurrentUserAttributes } from './project.model';

export interface User {
  sub?: string;
  username: string;
  email: string;
  name?: string;
  roles: string[];
  attributes?: CurrentUserAttributes;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface LoginResponse {
  status: string;
}
