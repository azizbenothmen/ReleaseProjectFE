export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export interface Project {
  id?: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  status: ProjectStatus;
  owner: string;
}

export interface CurrentUserAttributes {
  sub?: string;
  email_verified?: boolean;
  iss?: string;
  typ?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  azp?: string;
  scope?: string;
  iat?: string;
  exp?: string;
  sid?: string;
  jti?: string;
  name?: string;
  email?: string;
  resource_access?: Record<string, { roles: string[] }>;
  realm_access?: { roles: string[] };
  [key: string]: any;
}

export interface CurrentUser {
  sub: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
  attributes?: CurrentUserAttributes;
}