import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { TagFormComponent } from './features/github-tag/tag-form/tag-form.component';
import { RepoListComponent } from './features/Repo-list/repo-list.component';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './features/home-feat/home.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: TagFormComponent, canActivate: [authGuard] },
  { path: 'repo', component: RepoListComponent, canActivate: [authGuard] },
  {path:'home',component:HomeComponent, canActivate:[authGuard] },
  { path: '**', redirectTo: '' },
];
