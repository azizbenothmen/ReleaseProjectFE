import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { User, LoginCredentials, LoginResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = '/api/auth';

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isLoading = signal<boolean>(true);


  login(credentials: LoginCredentials): Observable<User> {
    this.isLoading.set(true);
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        switchMap(() => this.getCurrentUser()),
        map((user) => {
          if (!user) {
            throw new Error('Impossible de récupérer le profil utilisateur');
          }
          return user;
        })
      );
  }

  
  getCurrentUser(): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.currentUser.set(null);
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  
  refreshToken(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/refresh`, {}, { withCredentials: true });
  }

  logout(): void {
    this.http
      .post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(null)) 
      )
      .subscribe(() => {
        this.clearUserState();
        this.router.navigate(['/login']);
      });
  }

  
  clearUserState(): void {
    this.currentUser.set(null);
    this.isLoading.set(false);
  }
}
