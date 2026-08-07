import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, CreateProjectRequest, CurrentUser } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private baseUrl = 'http://localhost:8085';

  constructor(private http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/allprojects`);
  }

  createProject(project: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/CreateProject`, project);
  }

  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/api/auth/me`);
  }
}