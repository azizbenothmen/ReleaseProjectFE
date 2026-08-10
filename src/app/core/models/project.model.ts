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

export interface CurrentUser {
  sub: string;
  username: string;
  email: string;
  name: string;
  roles: string[];
}