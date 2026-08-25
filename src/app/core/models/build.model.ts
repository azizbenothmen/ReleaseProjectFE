import { Project } from './project.model';
import { ProjectRepo } from './project.details';

export type BuildResult = 'SUCCESS' | 'FAILURE' | 'UNSTABLE' | 'ABORTED' | 'BUILDING' | 'IN_PROGRESS' | string;

export interface Build {
  id: string;
  nameBuild: string;
  num: number;
  resultat: BuildResult;
  time?: string | null;
  duration?: number | string | null;
  project?: Project | null;
  repo?: ProjectRepo | null;
}
