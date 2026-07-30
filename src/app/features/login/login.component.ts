import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  private readonly backendUrl = 'http://localhost:8085';

  loginWithProvider(provider: 'github' | 'gitlab-oidc' | 'bitbucket' | 'azure'): void {
    window.location.href = `${this.backendUrl}/login/oauth2/code/${provider}`;
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.toastr.warning('Veuillez remplir tous les champs', 'Attention');
      return;
    }

    this.isLoading = true;
    this.authService.login({ username: this.email, password: this.password }).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.toastr.success(`Bienvenue, ${user.username} !`, 'Connexion réussie');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Identifiants invalides ou erreur serveur';
        this.toastr.error(msg, 'Échec de connexion');
      },
    });
  }
}