import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Project, CreateProjectRequest, CurrentUser } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private baseUrl = 'http://localhost:8085';

  constructor(private http: HttpClient) {}

  getProjects(owner:string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/owner/${owner}/allprojects`);
  }

  createProject(project: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/CreateProject`, project);
  }

  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/api/auth/me`);
  }

  deleteProject(id: number | string): Observable<any> {
    const url = `${this.baseUrl}/project/${id}/delete`;
    return this.http.delete(url, { responseType: 'text' }).pipe(
      catchError((err: any) => {
        if (err.status === 404 || err.status === 405) {
          return this.http.get(`${this.baseUrl}/delete/${id}`, { responseType: 'text' });
        }
        return throwError(() => err);
      })
    );
  }
}