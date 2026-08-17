import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProjectDetail } from '../../core/models/project.details';
import { ProjectStatus } from '../../core/models/project.model';

type TabId = 'overview' | 'repos' | 'tags' | 'activity';

interface ImportedRepoDetails {
  loginOwner: string;
  name: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project.info.html',
  styleUrl: './project.info.css'
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  readonly ProjectStatus = ProjectStatus;

  project = signal<ProjectDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<TabId>('overview');

  tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'overview' },
    { id: 'repos', label: 'Repos' },
    { id: 'tags', label: 'Tags' },
    { id: 'activity', label: 'Activity' }
  ];

  repoCount = computed(() => this.project()?.repos.length ?? 0);

  tagCount = computed(() =>
    this.project()?.repos.reduce((sum, repo) => sum + repo.tags.length, 0) ?? 0
  );

 allTags = computed(() =>
  this.project()?.repos.flatMap((repo) =>
    repo.tags.map((tag) => ({ ...tag, repoName: repo.name }))
  ) ?? []
);

  initials = computed(() => {
    const name = this.project()?.name ?? '';
    return name.slice(0, 2).toUpperCase();
  });

  errorMessage: string | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam;

    if (idParam === null) {
      this.error.set('Projet introuvable.');
      this.loading.set(false);
      return;
    }
    this.fetchProject(id);
  }

  private fetchProject(id: string | null): void {
    this.loading.set(true);
    this.http.get<ProjectDetail>(`http://localhost:8085/project/${id}`).subscribe({
      next: (data) => {
        this.project.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le projet.');
        this.loading.set(false);
      }
    });
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  copyCommit(sha: string): void {
    navigator.clipboard.writeText(sha);
  }

  importRepo(): void {
    const id = this.project()?.id;
    if (id !== undefined) {
      this.router.navigate(['projet', id,'repo' ]);
    }
  }

  goToTag(repo: any): void {
    const projectId = this.project()?.id;

    this.http.get<ImportedRepoDetails>(`http://localhost:8085/importedRepo/${repo.name}`)
      .subscribe({
        next: (data) => {
          this.router.navigate(['projet', projectId, 'repo', repo.id], {
            state: {
              owner: data.loginOwner,
              repo: data.name
            }
          });
        },
        error: (err) => {
          this.errorMessage = this.extractErrorMessage(err);
        }
      });
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || "Impossible de récupérer les informations du repository.";
  }
}