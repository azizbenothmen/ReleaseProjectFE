import { ProjectStatus } from './project.model';

export type UserGlobalRole = 'Admin' | 'Member' | 'Viewer';
export type AccountStatus = 'active' | 'disabled';
export type ProjectUserRole = 'Owner' | 'Contributor' | 'Viewer';
export type ScmProviderName = 'GitHub' | 'GitLab' | 'Bitbucket' | 'Azure DevOps';

export interface ScmConnection {
  provider: ScmProviderName;
  username?: string;
  connected: boolean;
  connectedAt?: string;
}

export interface KeycloakIdentity {
  sub: string;
  realm: string;
  identityProvider: string;
  emailVerified: boolean;
  issuer?: string;
  scope?: string;
  sid?: string;
  jti?: string;
  issuedAt?: string;
  expiresAt?: string;
  realmRoles?: string[];
}

export interface UserProjectMembership {
  id: number | string;
  name: string;
  description?: string;
  role: ProjectUserRole;
  repoCount: number;
  lastActivityDate: string;
  status: ProjectStatus;
  owner: string;
}

export interface UserActivityLog {
  id: number | string;
  type: 'tag_created' | 'repo_linked' | 'repo_unlinked' | 'project_created' | 'project_deleted';
  icon: string;
  actionDescription: string;
  projectName: string;
  projectId?: number | string;
  timestamp: string;
  metadata?: string;
}

export interface UserProfileDetails {
  id?: string | number;
  username: string;
  fullName: string;
  email: string;
  role: UserGlobalRole;
  status: AccountStatus;
  memberSince: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
  keycloak: KeycloakIdentity;
  scmConnections: ScmConnection[];
  projects: UserProjectMembership[];
  activities: UserActivityLog[];
}
