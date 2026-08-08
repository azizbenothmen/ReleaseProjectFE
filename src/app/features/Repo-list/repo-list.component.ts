import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

export interface RepoDto {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  owner: {
    login: string;
  };
}

interface RepoPayload {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  loginOwner: string;
}

interface ImportedRepoDetails {
  loginOwner: string;
  name: string;
}

@Component({
  selector: 'app-repo-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './repo-list.component.html',
  styleUrls: ['./repo-list.component.css']
})
export class RepoListComponent implements OnInit {

  repos: RepoDto[] = [];
  filteredRepos: RepoDto[] = [];
  searchTerm: string = '';

  loading = false;
  errorMessage: string | null = null;

  importedRepos: RepoDto[] = [];
  loadingImported = false;
  importedErrorMessage: string | null = null;

  importingRepoId: number | null = null;

  readonly pageSize = 10; 
  currentPage = 1;
  projectId: string | null = null;


  currentPageImported = 1;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id'); 
    this.fetchRepos();
    this.fetchImportedRepos();
    
  }

  fetchRepos(): void {
    this.loading = true;
    this.errorMessage = null;

    this.http.get<RepoDto[]>(`http://localhost:8085/repos`)
      .subscribe({
        next: (data) => {
          this.repos = data;
          this.filteredRepos = data;
          this.currentPage = 1;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = 'Impossible de charger les repositories.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  fetchImportedRepos(): void {
    this.loadingImported = true;
    this.importedErrorMessage = null;

    this.http.get<RepoPayload[]>(`http://localhost:8085/repoProject/${this.projectId}`)
      .subscribe({
        next: (data) => {
          this.importedRepos = data.map(r => this.toRepoDto(r));
          this.currentPageImported = 1;
          this.loadingImported = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.importedErrorMessage = 'Impossible de charger les repos importés.';
          this.loadingImported = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredRepos = this.repos.filter(r =>
      r.name.toLowerCase().includes(term)
    );
    this.currentPage = 1; 
    this.cdr.detectChanges();
  }

  importRepo(repo: RepoDto): void {
    if (this.importedRepos.some(r => r.id === repo.id)) {
      return;
    }

    this.importingRepoId = repo.id;
    this.importedErrorMessage = null;

    const payload: RepoPayload = this.toRepoPayload(repo);

    this.http.post<RepoPayload>(`http://localhost:8085/repoCreation/${this.projectId}`, payload)
      .subscribe({
        next: (savedRepo) => {
          this.importedRepos.push(this.toRepoDto(savedRepo));
          this.importingRepoId = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.importedErrorMessage = this.extractErrorMessage(err);
          this.importingRepoId = null;
          this.cdr.detectChanges();
        }
      });
  }

  goToTag(repo: RepoDto): void {
    this.http.get<ImportedRepoDetails>(`http://localhost:8085/importedRepo/${repo.name}`)
      .subscribe({
        next: (data) => {
          this.router.navigate(['/'], {
            state: {
              owner: data.loginOwner,
              repo: data.name
            }
          });
        },
        error: (err) => {
          this.importedErrorMessage = this.extractErrorMessage(err);
          this.cdr.detectChanges();
        }
      });
  }


  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRepos.length / this.pageSize));
  }

  get pagedRepos(): RepoDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRepos.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }


  get totalPagesImported(): number {
    return Math.max(1, Math.ceil(this.importedRepos.length / this.pageSize));
  }

  get pagedImportedRepos(): RepoDto[] {
    const start = (this.currentPageImported - 1) * this.pageSize;
    return this.importedRepos.slice(start, start + this.pageSize);
  }

  get pageNumbersImported(): number[] {
    return Array.from({ length: this.totalPagesImported }, (_, i) => i + 1);
  }

  goToPageImported(page: number): void {
    if (page < 1 || page > this.totalPagesImported) return;
    this.currentPageImported = page;
  }

  private toRepoPayload(repo: RepoDto): RepoPayload {
    return {
      id: repo.id,
      nodeId: repo.nodeId,
      name: repo.name,
      fullName: repo.fullName,
      loginOwner: repo.owner?.login ?? ''
    };
  }

  private toRepoDto(payload: RepoPayload): RepoDto {
    return {
      id: payload.id,
      nodeId: payload.nodeId,
      name: payload.name,
      fullName: payload.fullName,
      owner: { login: payload.loginOwner }
    };
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || "Impossible d'importer ce repository.";
  }
}