import { Project } from "./project.model";

export type ScmProvider = 'GitHub' | 'GitLab' | 'Bitbucket' | 'Azure DevOps';

export interface ProjectDetail extends Project {
  repos: ProjectRepo[];
  scmProvider?: ScmProvider;
  team?: string;
}

export interface ProjectRepo {
  id: number;
  name: string;
  full_name: string | null;
  loginOwner: string;
  node_id: string | null;
  defaultBranch?: string;
  lastSyncDate?: string;
  url?: string;
  scmProvider?: ScmProvider;
  tags: ProjectTag[];
}

export interface ProjectTag {
  id: number;
  tag: string;            // nom du tag, ex: "v1.7.9"
  sha: string;             // sha de l'objet tag Git
  commitsha: string;       // sha du commit pointé par le tag
  commitMessage: string;   // message du commit
  message: string;         // message du tag (souvent identique à commitMessage)
  tagger?: string;
  url?: string;
  node_id: string | null;
  branch?: string;
  createdAt?: string;
}