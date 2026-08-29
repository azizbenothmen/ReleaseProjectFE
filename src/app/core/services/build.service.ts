import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Build } from '../models/build.model';

@Injectable({
  providedIn: 'root'
})
export class BuildService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8085';

  
  getBuildsByOwner(owner: string): Observable<Build[]> {
    const url = `${this.baseUrl}/owner/${encodeURIComponent(owner)}/builds`;
    return this.http.get<Build[]>(url).pipe(
      catchError((err) => {
        if (err.status === 404) {
          const fallbackUrl = `${this.baseUrl}/owner/${encodeURIComponent(owner)}/builds`;
          return this.http.get<Build[]>(fallbackUrl);
        }
        return throwError(() => err);
      })
    );
  }

  
  getBuildById(owner: string, buildId: string): Observable<Build> {
    const url = `${this.baseUrl}/build/${encodeURIComponent(buildId)}`;
    return this.http.get<Build>(url).pipe(
      catchError((err) => {
        if (err.status === 404) {
          const fallbackUrl = `${this.baseUrl}/build/${encodeURIComponent(buildId)}`;
          return this.http.get<Build>(fallbackUrl);
        }
        return throwError(() => err);
      })
    );
  }

  deleteBuild(buildId: string | number): Observable<any> {
    const url = `${this.baseUrl}/build/${encodeURIComponent(buildId)}/delete`;
    return this.http.get(url, { responseType: 'text' }).pipe(
      catchError((err) => {
        if (err.status === 405 || err.status === 404) {
          return this.http.get(url, { responseType: 'text' });
        }
        return throwError(() => err);
      })
    );
  }
}
