import { Component, ChangeDetectorRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GithubService, Branch, Commit } from '../../../core/services/github.service';
import { CreateTagRequest } from '../../../models/tag.model';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { combineLatest, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-tag-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './tag-form.component.html',
  styleUrls: ['./tag-form.component.css']
})
export class TagFormComponent implements OnInit, OnDestroy {

  private authService = inject(AuthService);

  tagForm: FormGroup;
  loading = false;
  loadingBranches = false;
  loadingCommits = false;
  projectId=''

  branches: Branch[] = [];
  commits: Commit[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private githubService: GithubService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route:ActivatedRoute
  ) {
    this.tagForm = this.fb.group({
      owner: ['', Validators.required],
      repo: ['', Validators.required],
      branch: ['', Validators.required],
      commit: ['', Validators.required],
      tagName: ['', Validators.required],
      message: ['', Validators.required],
      taggerName: [{ value: '', disabled: true }, Validators.required],
      taggerEmail: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
    });

    combineLatest([
      this.tagForm.get('owner')!.valueChanges,
      this.tagForm.get('repo')!.valueChanges
    ]).pipe(
      debounceTime(400),
      distinctUntilChanged((prev, curr) => prev[0] === curr[0] && prev[1] === curr[1]),
      takeUntil(this.destroy$)
    ).subscribe(([owner, repo]) => {
      this.branches = [];
      this.commits = [];
      this.tagForm.get('branch')?.setValue('', { emitEvent: false });
      this.tagForm.get('commit')?.setValue('', { emitEvent: false });
      this.cdr.markForCheck();

      if (owner && repo) {
        this.loadBranches(owner, repo);
      }
    });

    this.tagForm.get('branch')?.valueChanges.pipe(
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((branch) => {
      this.commits = [];
      this.tagForm.get('commit')?.setValue('', { emitEvent: false });
      this.cdr.markForCheck();

      const owner = this.tagForm.get('owner')?.value;
      const repo = this.tagForm.get('repo')?.value;

      if (owner && repo && branch) {
        this.loadCommits(owner, repo, branch);
      }
    });
  }

  ngOnInit(): void {
      this.projectId = this.route.snapshot.paramMap.get('projectId')!; 
    this.loadCurrentUser();
    this.loadTagContextFromNavigation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTagContextFromNavigation(): void {
    const state = history.state as { owner?: string; repo?: string };
    if (state?.owner || state?.repo) {
      this.tagForm.patchValue({
        owner: state.owner ?? '',
        repo: state.repo ?? ''
      });
    }
  }

  private loadCurrentUser(): void {
    const cached = this.authService.currentUser();
    if (cached) {
      this.patchTaggerFields(cached.username, cached.email);
      return;
    }

    this.authService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        if (user) {
          this.patchTaggerFields(user.username, user.email);
        } else {
          this.toastr.error("Impossible de récupérer les informations de l'utilisateur connecté.");
        }
        this.cdr.detectChanges();
      }
    });
  }

  private patchTaggerFields(name: string, email: string): void {
    this.tagForm.patchValue({
      taggerName: name,
      taggerEmail: email
    });
    this.cdr.detectChanges();
  }

  loadBranches(owner: string, repo: string): void {
    this.loadingBranches = true;
    this.branches = [];

    this.githubService.getBranches(owner, repo).subscribe({
      next: (branches: Branch[]) => {
        this.branches = branches;
        this.loadingBranches = false;

        if (branches.length === 0) {
          this.toastr.info('Aucune branche trouvée pour ce dépôt.');
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingBranches = false;
        this.toastr.error(this.extractErrorMessage(err));
        this.cdr.detectChanges();
      }
    });
  }

  loadCommits(owner: string, repo: string, branch: string): void {
    this.loadingCommits = true;
    this.commits = [];

    this.githubService.getCommits(owner, repo, branch).subscribe({
      next: (commits: Commit[]) => {
        this.commits = commits;
        this.loadingCommits = false;

        if (commits.length === 0) {
          this.toastr.info('Aucun commit trouvé pour cette branche.');
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingCommits = false;
        this.toastr.error(this.extractErrorMessage(err));
        this.cdr.detectChanges();
      }
    });
  }

  truncateMessage(message: string, length = 60): string {
    const firstLine = message.split('\n')[0];
    return firstLine.length > length ? firstLine.substring(0, length) + '…' : firstLine;
  }

  onSubmit(): void {
    if (this.tagForm.invalid) {
      this.toastr.error('Veuillez remplir correctement tous les champs.');
      return;
    }

    this.loading = true;

    const { owner, repo, branch, commit, tagName, message, taggerName, taggerEmail } = this.tagForm.getRawValue();

    const tagRequest: CreateTagRequest = {
      tag: tagName,
      message: message,
      object: commit,
      type: 'commit',
      tagger: {
        name: taggerName,
        email: taggerEmail,
        date: new Date().toISOString()
      }
    };

    this.githubService.createTag(owner, repo, branch, tagRequest,this.projectId).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success(`Tag "${tagRequest.tag}" créé avec succès !`);
        this.cdr.detectChanges();
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(this.extractErrorMessage(err));
        this.cdr.detectChanges();
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (typeof err.error === 'string') {
      const key = '"message":"';
      const start = err.error.indexOf(key) + key.length;
      const end = err.error.indexOf('"', start);
      if (start !== -1 && end !== -1) {
        return err.error.substring(start, end);
      }
      return err.error;
    }
    if (err.error?.message) {
      return err.error.message;
    }
    return err.message || 'Une erreur inconnue est survenue.';
  }
}