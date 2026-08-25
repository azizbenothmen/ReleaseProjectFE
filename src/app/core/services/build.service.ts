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

  /**
   * Fetch all builds for a given owner from backend API GET /api/owners/{owner}/builds
   */
  getBuildsByOwner(owner: string): Observable<Build[]> {
    const url = `${this.baseUrl}/api/owners/${encodeURIComponent(owner)}/builds`;
    return this.http.get<Build[]>(url).pipe(
      catchError((err) => {
        // Fallback to alternative path /owner/{owner}/builds if /api/owners/{owner}/builds returns 404
        if (err.status === 404) {
          const fallbackUrl = `${this.baseUrl}/owner/${encodeURIComponent(owner)}/builds`;
          return this.http.get<Build[]>(fallbackUrl);
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Fetch single build details by owner and build ID
   */
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
}
