import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { LandingComponent } from './features/landing/landing.component';
import { TagFormComponent } from './features/github-tag/tag-form/tag-form.component';
import { RepoListComponent } from './features/Repo-list/repo-list.component';
import { HomeComponent } from './features/home-feat/home.component';
import { LayoutComponent } from '../app/core/Layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { ProjectListComponent } from './features/project-feat/project-list.component';
import { noAuthGuard } from './core/guards/noauth.guard';
import { ProjectDetailComponent } from './features/project-info/project.info';
import { UserProfileComponent } from './features/user-profile/user-profile.component';

import { BuildListComponent } from './features/build-feat/build-list.component';
import { BuildDetailComponent } from './features/build-feat/build-detail.component';

export const routes: Routes = [
  {
    path: 'welcome',
    component: LandingComponent,
    canActivate: [noAuthGuard]
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [noAuthGuard],
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '' ,redirectTo:'/home',pathMatch: 'full'},
      { path: 'owner/:owner/builds', component: BuildListComponent },
      { path: 'owner/:owner/builds/:id', component: BuildDetailComponent },
      { path: 'projet/:projectId/repo/:id', component: TagFormComponent },
      { path: 'projet/:id/repo', component: RepoListComponent },
      { path: 'home', component: HomeComponent },
      { path: 'projects', component: ProjectListComponent },
      { path: 'project/:id', component: ProjectDetailComponent },
      { path: 'profile', component: UserProfileComponent },
      { path: 'profile/:username', component: UserProfileComponent },
    ],
  },
  { path: '**', redirectTo: '/welcome' }
];
