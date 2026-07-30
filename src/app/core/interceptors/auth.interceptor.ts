import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError, Observable } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isAuthEndpoint =
          req.url.includes('/api/auth/login') ||
          req.url.includes('/api/auth/refresh') ||
          req.url.includes('/api/auth/logout');

        if (isAuthEndpoint) {
          if (req.url.includes('/api/auth/refresh')) {
            authService.clearUserState();
            router.navigate(['/login']);
          }
          return throwError(() => error);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap(() => {
              isRefreshing = false;
              refreshTokenSubject.next(true);
              return next(authReq);
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              refreshTokenSubject.next(false);
              authService.clearUserState();
              router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        } else {
          return refreshTokenSubject.pipe(
            filter((result): result is boolean => result !== null),
            take(1),
            switchMap((success) => {
              if (success) {
                return next(authReq);
              }
              return throwError(() => error);
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};
