import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface RepoDto {
  id: number;
  nodeId?: string;
  name: string;
  fullName?: string;
  owner?: {
    login: string;
  };
  private?: boolean;
  visibility?: string;
  updatedAt?: string;
  updated_at?: string;
  pushed_at?: string;
}

interface RepoPayload {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  loginOwner: string;
}

@Component({
  selector: 'app-import-repo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-repo-modal.component.html',
  styleUrls: ['./import-repo-modal.component.css']
})
export class ImportRepoModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() projectId: number | string | null | undefined = null;
  @Input() alreadyImportedIds: number[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() repoImported = new EventEmitter<RepoDto>();

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  repos: RepoDto[] = [];
  filteredRepos: RepoDto[] = [];
  searchTerm = '';

  loading = false;
  errorMessage: string | null = null;
  importingRepoId: number | null = null;
  successNotification: string | null = null;

  readonly pageSize = 4;
  currentPage = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetModal();
      this.fetchRepos();
    }
  }

  resetModal(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.errorMessage = null;
    this.successNotification = null;
    this.importingRepoId = null;
  }

  fetchRepos(): void {
    this.loading = true;
    this.errorMessage = null;

    this.http.get<RepoDto[]>('http://localhost:8085/repos').subscribe({
      next: (data) => {
        this.repos = data || [];
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load user repositories.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredRepos = [...this.repos];
    } else {
      this.filteredRepos = this.repos.filter((repo) =>
        repo.name.toLowerCase().includes(term) ||
        (repo.fullName && repo.fullName.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRepos.length / this.pageSize));
  }

  get pagedRepos(): RepoDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRepos.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const maxVisible = 5;
    if (this.totalPages <= maxVisible) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  isAlreadyImported(repoId: number): boolean {
    return this.alreadyImportedIds.includes(repoId);
  }

  importRepo(repo: RepoDto): void {
    if (!this.projectId) {
      this.errorMessage = 'No project selected.';
      return;
    }
    if (this.isAlreadyImported(repo.id) || this.importingRepoId !== null) {
      return;
    }

    this.importingRepoId = repo.id;
    this.errorMessage = null;
    this.successNotification = null;

    const payload: RepoPayload = {
      id: repo.id,
      nodeId: repo.nodeId || '',
      name: repo.name,
      fullName: repo.fullName || repo.name,
      loginOwner: repo.owner?.login || ''
    };

    this.http.post<RepoPayload>(`http://localhost:8085/project/${this.projectId}/repoCreation`, payload).subscribe({
      next: () => {
        this.importingRepoId = null;
        this.alreadyImportedIds = [...this.alreadyImportedIds, repo.id];
        this.successNotification = `Repository "${repo.name}" imported successfully!`;
        this.repoImported.emit(repo);
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.successNotification) {
            this.successNotification = null;
            this.cdr.detectChanges();
          }
        }, 3000);
      },
      error: (err) => {
        this.importingRepoId = null;
        this.errorMessage = this.extractErrorMessage(err);
        this.cdr.detectChanges();
      }
    });
  }

  close(): void {
    this.closeModal.emit();
  }

  getVisibility(repo: RepoDto): string {
    if (repo.visibility) {
      return repo.visibility.charAt(0).toUpperCase() + repo.visibility.slice(1);
    }
    if (repo.private !== undefined) {
      return repo.private ? 'Private' : 'Public';
    }
    return 'Public';
  }

  getUpdatedDate(repo: RepoDto): string | null {
    const rawDate = repo.updatedAt || repo.updated_at || repo.pushed_at;
    if (!rawDate) return null;
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'Failed to import repository.';
  }
}
