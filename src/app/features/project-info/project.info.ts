import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProjectDetail, ProjectRepo, ProjectTag, ScmProvider, AuditLog } from '../../core/models/project.details';
import { ProjectStatus, CurrentUser } from '../../core/models/project.model';
import { ProjectService } from '../../core/services/project.service';

type TabId = 'overview' | 'repos' | 'tags' | 'activity';

interface ImportedRepoDetails {
  loginOwner: string;
  name: string;
}

export interface EnrichedTag extends ProjectTag {
  repoName: string;
  repoOwner: string;
  displayTagger: string;
  displayBranch: string;
  displayDate: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project.info.html',
  styleUrl: './project.info.css'
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private projectService = inject(ProjectService);

  readonly ProjectStatus = ProjectStatus;

  project = signal<ProjectDetail | null>(null);
  currentUser = signal<CurrentUser | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<TabId>('overview');

  auditLogs = signal<AuditLog[]>([]);
  loadingAuditLogs = signal(false);
  auditLogsError = signal<string | null>(null);

  deleting = signal(false);
  showDeleteModal = signal(false);
  copiedSha = signal<string | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private notificationTimeout: any;

  tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'repos', label: 'Repositories' },
    { id: 'tags', label: 'Tags' },
    { id: 'activity', label: 'Activity' }
  ];

  repoCount = computed(() => this.project()?.repos?.length ?? 0);

  tagCount = computed(() =>
    this.project()?.repos?.reduce((sum, repo) => sum + (repo.tags?.length || 0), 0) ?? 0
  );

  allTags = computed<EnrichedTag[]>(() => {
    const p = this.project();
    if (!p || !p.repos) return [];

    const user = this.currentUser();
    const fallbackTagger = user?.name || user?.username || (p.owner ? `@${p.owner}` : 'GitOps System');

    const tags: EnrichedTag[] = [];

    p.repos.forEach((repo) => {
      if (!repo.tags) return;
      repo.tags.forEach((tag) => {
        tags.push({
          ...tag,
          repoName: repo.name,
          repoOwner: repo.loginOwner || p.owner,
          displayTagger: tag.tagger && tag.tagger.trim() !== '' ? tag.tagger : fallbackTagger,
          displayBranch: tag.branch || repo.defaultBranch || 'main',
          displayDate: tag.createdAt || p.createdAt || new Date().toISOString()
        });
      });
    });

    // Chronological order (newest tags first)
    return tags.sort((a, b) => b.id - a.id);
  });

  initials = computed(() => {
    const name = this.project()?.name ?? '';
    if (!name) return 'PR';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  errorMessage: string | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam === null) {
      this.error.set('Project not found.');
      this.loading.set(false);
      return;
    }
    this.loadCurrentUser();
    this.fetchProject(idParam);
  }

  ngOnDestroy(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  private loadCurrentUser(): void {
    this.projectService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
      },
      error: () => {
      }
    });
  }

  private fetchProject(id: string): void {
    this.loading.set(true);
    this.http.get<ProjectDetail>(`http://localhost:8085/project/${id}`).subscribe({
      next: (data) => {
        if (data.repos) {
          data.repos = data.repos.map((repo) => ({
            ...repo,
            defaultBranch: repo.defaultBranch || 'main',
            lastSyncDate: repo.lastSyncDate || data.createdAt || new Date().toISOString(),
            scmProvider: repo.scmProvider || data.scmProvider || this.detectScmProvider(repo)
          }));
        }
        this.project.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load project details.');
        this.loading.set(false);
      }
    });
  }

  detectScmProvider(repo?: ProjectRepo): ScmProvider {
    const p = this.project();
    if (repo?.scmProvider) return repo.scmProvider;
    if (p?.scmProvider) return p.scmProvider;
    const name = (repo?.full_name || repo?.name || '').toLowerCase();
    if (name.includes('gitlab')) return 'GitLab';
    if (name.includes('bitbucket')) return 'Bitbucket';
    if (name.includes('azure') || name.includes('devops')) return 'Azure DevOps';
    return 'GitHub';
  }

  getRepoUrl(repo: ProjectRepo): string {
    if (repo.url) return repo.url;
    const owner = repo.loginOwner || this.project()?.owner || 'owner';
    const provider = this.detectScmProvider(repo);
    switch (provider) {
      case 'GitLab':
        return `https://gitlab.com/${owner}/${repo.name}`;
      case 'Bitbucket':
        return `https://bitbucket.org/${owner}/${repo.name}`;
      case 'Azure DevOps':
        return `https://dev.azure.com/${owner}/${repo.name}`;
      case 'GitHub':
      default:
        return `https://github.com/${owner}/${repo.name}`;
    }
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
    if (tab === 'activity') {
      this.fetchAuditLogs();
    }
  }

  fetchAuditLogs(id?: string | number): void {
    const projectId = id ?? this.project()?.id;
    if (projectId === undefined || projectId === null) return;

    this.loadingAuditLogs.set(true);
    this.auditLogsError.set(null);

    this.http.get<AuditLog[]>(`http://localhost:8085/project/${projectId}/AuditLogs`).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs || []);
        this.loadingAuditLogs.set(false);
      },
      error: (err) => {
        console.error('Error fetching audit logs', err);
        this.auditLogsError.set('Unable to load activity audit logs.');
        this.loadingAuditLogs.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  copyCommit(sha: string): void {
    if (!sha) return;
    navigator.clipboard.writeText(sha);
    this.copiedSha.set(sha);
    this.showToast('success', `Copied commit SHA (${sha.slice(0, 7)}) to clipboard!`);
    setTimeout(() => {
      if (this.copiedSha() === sha) {
        this.copiedSha.set(null);
      }
    }, 2500);
  }

  importRepo(): void {
    const id = this.project()?.id;
    if (id !== undefined) {
      this.router.navigate(['projet', id, 'repo']);
    }
  }

  goToTag(repo: ProjectRepo): void {
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
          this.showToast('error', this.errorMessage);
        }
      });
  }

  openDeleteModal(): void {
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  confirmDelete(): void {
    const p = this.project();
    if (!p || p.id == null) return;

    this.deleting.set(true);
    this.projectService.deleteProject(p.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.showToast('success', `Project "${p.name}" deleted successfully.`);
        setTimeout(() => {
          this.router.navigate(['/projects']);
        }, 1000);
      },
      error: () => {
        this.deleting.set(false);
        this.showToast('error', 'Failed to delete project. Please try again.');
      }
    });
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

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'Unable to retrieve repository information.';
  }
}