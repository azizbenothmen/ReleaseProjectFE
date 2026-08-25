import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDetail } from '../../core/models/project.details';
import { Project } from '../../core/models/project.model';
import { switchMap, catchError, of, forkJoin, timeout } from 'rxjs';

export interface StatCard {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private static statsCache: StatCard[] | null = null;

  loading = true;
  username = '';
  
  stats: StatCard[] = [
    { label: 'Projets actifs', value: '-', delta: 'Chargement...', positive: true, icon: 'folder' },
    { label: 'Dépôts importés', value: '-', delta: 'Chargement...', positive: true, icon: 'repo' },
    { label: 'Releases & Tags', value: '-', delta: 'Chargement...', positive: true, icon: 'tag' },
    { label: 'Statut système', value: '100%', delta: 'Services opérationnels', positive: true, icon: 'check' }
  ];

  ngOnInit(): void {
    // 1. Affichage instantané (0ms) si les statistiques sont déjà en cache mémoire
    if (HomeComponent.statsCache) {
      this.stats = HomeComponent.statsCache;
      this.loading = false;
    }
    
    this.fetchDynamicStats();
  }

  fetchDynamicStats(): void {
    // Utiliser l'utilisateur actuellement authentifié en mémoire pour éviter une requête réseau inutile
    const currentUser = this.authService.currentUser();
    const user$ = currentUser && currentUser.username ? of(currentUser) : this.projectService.getCurrentUser();

    user$.pipe(
      switchMap((user) => {
        if (user && user.username) {
          this.username = user.username;
          return this.projectService.getProjects(user.username);
        }
        return of([]);
      }),
      catchError((err) => {
        console.error('Erreur chargement projets home', err);
        return of([]);
      })
    ).subscribe({
      next: (projects: Project[]) => {
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status === 'ACTIVE' || (p.status as any) === 'ACTIVE').length;

        // 2. Rendu IMMÉDIAT dès réception de la liste des projets (~50ms) sans attendre les détails de chaque projet
        this.updateStatsDisplay(activeProjects, totalProjects, 0, 0, false);
        this.loading = false;

        if (projects.length > 0) {
          // 3. Récupération asynchrone non-bloquante des détails avec timeout de 2s par requête
          const detailRequests = projects.map(p =>
            this.http.get<ProjectDetail>(`http://localhost:8085/project/${p.id}`).pipe(
              timeout(2000),
              catchError(() => of(null))
            )
          );

          forkJoin(detailRequests).subscribe((details) => {
            let totalRepos = 0;
            let totalTags = 0;

            details.forEach(d => {
              if (d && d.repos) {
                totalRepos += d.repos.length;
                d.repos.forEach(r => {
                  if (r.tags) {
                    totalTags += r.tags.length;
                  }
                });
              }
            });

            // Enrichissement progressif dès que tous les détails sont disponibles
            this.updateStatsDisplay(activeProjects, totalProjects, totalRepos, totalTags, true);
          });
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private updateStatsDisplay(activeProjects: number, totalProjects: number, totalRepos: number, totalTags: number, detailsLoaded: boolean): void {
    this.stats = [
      { 
        label: 'Projets actifs', 
        value: `${activeProjects}`, 
        delta: `${totalProjects} projet(s) au total`, 
        positive: true, 
        icon: 'folder' 
      },
      { 
        label: 'Dépôts importés', 
        value: detailsLoaded ? `${totalRepos}` : (totalRepos > 0 ? `${totalRepos}` : '...'), 
        delta: 'Connectés à GitOps', 
        positive: true, 
        icon: 'repo' 
      },
      { 
        label: 'Releases & Tags', 
        value: detailsLoaded ? `${totalTags}` : (totalTags > 0 ? `${totalTags}` : '...'), 
        delta: 'Tags Git créés', 
        positive: true, 
        icon: 'tag' 
      },
      { 
        label: 'Statut système', 
        value: '100%', 
        delta: 'Services opérationnels', 
        positive: true, 
        icon: 'check' 
      }
    ];
    HomeComponent.statsCache = this.stats;
  }

  goToProjects(): void {
    this.router.navigate(['/projects']);
  }

  logout(): void {
    this.authService.logout();
  }
}