import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { TagFormComponent } from './features/github-tag/tag-form/tag-form.component';
import { RepoListComponent } from './features/Repo-list/repo-list.component';
import { HomeComponent } from './features/home-feat/home.component';
import { LayoutComponent } from '../app/core/Layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { ProjectListComponent } from './features/project-feat/project-list.component';
import { noAuthGuard } from './core/guards/noauth.guard';
import { ProjectDetailComponent } from './features/project-info/project.info';

export const routes: Routes = [
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
      { path: '', component: TagFormComponent },
      { path: 'projet/repo/:id', component: RepoListComponent },
      { path: 'home', component: HomeComponent },
      { path: 'projects', component: ProjectListComponent },
      {path:'project/:id',component:ProjectDetailComponent}
    ],
  },
];