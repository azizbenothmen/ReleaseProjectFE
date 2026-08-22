import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../../core/services/project.service';
import { ProjectStatus } from '../../core/models/project.model';
import {
  UserProfileDetails,
  ScmConnection,
  UserProjectMembership,
  UserActivityLog
} from '../../core/models/user-profile.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private projectService = inject(ProjectService);

  readonly ProjectStatus = ProjectStatus;

  profile = signal<UserProfileDetails | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private notificationTimeout: any;

  initials = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const name = p.fullName || p.username || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  projectCount = computed(() => this.profile()?.projects?.length ?? 0);

  connectedScmCount = computed(
    () => this.profile()?.scmConnections?.filter((scm) => scm.connected).length ?? 0
  );

  ngOnInit(): void {
    const usernameParam = this.route.snapshot.paramMap.get('username');
    this.loadUserProfile(usernameParam);
  }

  ngOnDestroy(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  loadUserProfile(targetUsername: string | null): void {
    this.loading.set(true);
    this.error.set(null);

    // Retrieve current logged in user directly from backend API
    this.projectService.getCurrentUser().subscribe({
      next: (userData: any) => {
        if (!userData) {
          this.error.set('Impossible de charger le profil utilisateur.');
          this.loading.set(false);
          return;
        }
        const mappedProfile = this.mapAuthMeToUserProfile(userData, targetUsername);
        this.fetchUserProjects(mappedProfile);
      },
      error: (err) => {
        this.error.set(this.extractErrorMessage(err, 'Impossible de récupérer les informations du profil utilisateur.'));
        this.loading.set(false);
      }
    });
  }

  private mapAuthMeToUserProfile(res: any, targetUsername: string | null): UserProfileDetails {
    const attr = res.attributes || {};
    const username = targetUsername || res.username || attr.preferred_username || '';
    const fullName = res.name || attr.name || (attr.given_name ? `${attr.given_name} ${attr.family_name || ''}`.trim() : username);
    const email = res.email || attr.email || '';
    const sub = res.sub || attr.sub || '';

    let realm = '';
    if (attr.iss && attr.iss.includes('/realms/')) {
      realm = attr.iss.split('/realms/')[1];
    }

    const resourceRoles = attr.resource_access?.['realm-management']?.roles || [];
    const realmRoles = res.roles || attr.realm_access?.roles || [];
    const allRoles: string[] = [...realmRoles, ...resourceRoles];

    let userRole: 'Admin' | 'Member' | 'Viewer' = 'Member';
    if (allRoles.includes('manage-realm') || allRoles.includes('ROLE_ADMIN') || allRoles.includes('admin')) {
      userRole = 'Admin';
    } else if (allRoles.includes('USER_APP') || allRoles.includes('default-roles-release-plateform')) {
      userRole = 'Member';
    }

    return {
      id: sub,
      username: username,
      fullName: fullName,
      email: email,
      role: userRole,
      status: 'active',
      memberSince: attr.iat || new Date().toISOString(),
      lastLogin: attr.iat || new Date().toISOString(),
      twoFactorEnabled: true,
      keycloak: {
        sub: sub,
        realm: realm,
        identityProvider: attr.azp || '',
        emailVerified: attr.email_verified ?? false,
        issuer: attr.iss || '',
        scope: attr.scope || '',
        sid: attr.sid || '',
        jti: attr.jti || '',
        issuedAt: attr.iat,
        expiresAt: attr.exp,
        realmRoles: realmRoles
      },
      scmConnections: [],
      projects: [],
      activities: []
    };
  }

  private fetchUserProjects(profileDetails: UserProfileDetails): void {
    if (!profileDetails.username) {
      this.profile.set(profileDetails);
      this.loading.set(false);
      return;
    }

    this.projectService.getProjects(profileDetails.username).subscribe({
      next: (projectsList) => {
        profileDetails.projects = (projectsList || []).map((p) => ({
          id: p.id || 0,
          name: p.name,
          description: p.description || '',
          role: p.owner === profileDetails.username ? 'Owner' : 'Contributor',
          repoCount: 0,
          lastActivityDate: p.updatedAt || p.createdAt || new Date().toISOString(),
          status: p.status,
          owner: p.owner
        }));
        this.profile.set(profileDetails);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.extractErrorMessage(err, 'Impossible de charger les projets de l\'utilisateur.'));
        this.loading.set(false);
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goBack(): void {
    this.goHome();
  }

  goToProject(projectId: number | string): void {
    if (projectId) {
      this.router.navigate(['/project', projectId]);
    }
  }

  showToast(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.notification.set(null);
    }, 4000);
  }

  closeToast(): void {
    this.notification.set(null);
  }

  private extractErrorMessage(err: any, fallback: string): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (typeof err?.error === 'string') {
      return err.error;
    }
    return err?.message || fallback;
  }
}
