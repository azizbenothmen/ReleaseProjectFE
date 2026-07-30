import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Structure utilisée pour l'affichage (correspond au JSON GitHub, avec owner.login imbriqué)
export interface RepoDto {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  owner: {
    login: string;
  };
}

// Structure EXACTE attendue par le backend (doit matcher l'entité RepoUser)
interface RepoPayload {
  id: number;
  nodeId: string;
  name: string;
  fullName: string;
  loginOwner: string;
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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

    // Le backend renvoie une structure plate (loginOwner) -> on la remappe en owner.login pour l'affichage
    this.http.get<RepoPayload[]>(`http://localhost:8085/repoBd`)
      .subscribe({
        next: (data) => {
          this.importedRepos = data.map(r => this.toRepoDto(r));
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
    this.cdr.detectChanges();
  }

  importRepo(repo: RepoDto): void {
    if (this.importedRepos.some(r => r.id === repo.id)) {
      return;
    }

    this.importingRepoId = repo.id;
    this.importedErrorMessage = null;

    // On aplatit owner.login -> loginOwner avant d'envoyer au backend (doit matcher l'entité Java)
    const payload: RepoPayload = this.toRepoPayload(repo);

    this.http.post<RepoPayload>(`http://localhost:8085/repoCreation`, payload)
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
    this.router.navigate(['/'], { state: { repo } });
  }

  // --- Mapping helpers ---

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