import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { Project, ProjectStatus } from '../../core/models/project.model';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-list.html',
  styleUrls: ['./project-list.css']
})
export class ProjectListComponent implements OnInit, OnDestroy {

  projects: Project[] = [];
  loading = false;
  errorMessage: string | null = null;

  isModalOpen = false;
  submitting = false;
  owner:string='';
  formErrorMessage: string | null = null;
  deletingId: number | string | undefined | null = null;

  // Notification toast
  notification: { type: 'success' | 'error'; message: string } | null = null;
  private notificationTimeout: any;

  loadingOwner = false;
  ownerErrorMessage: string | null = null;

  projectForm: FormGroup;
  statusOptions = Object.values(ProjectStatus);

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.maxLength(1000)]],
      status: [ProjectStatus.ACTIVE, Validators.required],
      owner: ['', Validators.required]
    });

    this.projectForm.get('owner')?.disable();
  }

  ngOnInit(): void {
    this.fetchProjects();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  fetchProjects(): void {
  this.loading = true;
  this.errorMessage = null;

  this.projectService.getCurrentUser().pipe(
    switchMap((user) => {
      this.owner = user.username;
      return this.projectService.getProjects(this.owner);
    })
  ).subscribe({
    next: (data) => {
      this.projects = data;
      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.errorMessage = 'Unable to load projects.';
      this.loading = false;
      this.cdr.detectChanges();
    }
  });
}

  openModal(): void {
    this.isModalOpen = true;
    this.formErrorMessage = null;
    this.projectForm.reset({
      name: '',
      description: '',
      status: ProjectStatus.ACTIVE,
      owner: ''
    });
    document.body.style.overflow = 'hidden';
    this.loadCurrentOwner();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.formErrorMessage = null;
    document.body.style.overflow = '';
  }

  onOverlayClick(): void {
    this.closeModal();
  }

  private loadCurrentOwner(): void {
    this.loadingOwner = true;
    this.ownerErrorMessage = null;

    this.projectService.getCurrentUser().subscribe({
      next: (user) => {
        this.projectForm.get('owner')?.setValue(user.username);
        this.loadingOwner = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.ownerErrorMessage = "Unable to fetch the current user.";
        this.loadingOwner = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.formErrorMessage = 'Please correct the invalid fields.';
      return;
    }

    const owner = this.projectForm.get('owner')?.value;
    if (!owner) {
      this.formErrorMessage = "The owner could not be determined. Please try again.";
      return;
    }

    this.submitting = true;
    this.formErrorMessage = null;

    const { name, description, status } = this.projectForm.getRawValue();

    this.projectService.createProject({ name, description, status, owner }).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.fetchProjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submitting = false;
        this.formErrorMessage = this.extractErrorMessage(err);
        this.cdr.detectChanges();
      }
    });
  }

  goToImportRepo(project: Project): void {
    this.router.navigate(['projet', project.id,'repo']);
  }

  projectToDelete: Project | null = null;
  showDeleteModal = false;

  openDeleteModal(event: Event, project: Project): void {
    event.stopPropagation();
    if (!project.id) return;
    this.projectToDelete = project;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.projectToDelete = null;
  }

  confirmDeleteProject(): void {
    if (!this.projectToDelete || this.projectToDelete.id == null) return;
    const projectId = this.projectToDelete.id;

    this.deletingId = projectId;

    this.projectService.deleteProject(projectId).subscribe({
      next: () => {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.deletingId = null;
        this.closeDeleteModal();
        this.showNotification('success', 'Project deleted successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingId = null;
        this.closeDeleteModal();
        this.showNotification('error', 'Unable to delete the project.');
        this.cdr.detectChanges();
      }
    });
  }

  showNotification(type: 'success' | 'error', message: string): void {
    this.notification = { type, message };
    this.cdr.detectChanges();

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.notification = null;
      this.cdr.detectChanges();
    }, 4000);
  }

  closeNotification(): void {
    this.notification = null;
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  get name() { return this.projectForm.get('name'); }
  get description() { return this.projectForm.get('description'); }
  get status() { return this.projectForm.get('status'); }

  private extractErrorMessage(err: any): string {
    const rawMessage = typeof err?.error === 'string'
      ? err.error
      : err?.error?.message || err?.message || '';

    const fullErrorStr = (rawMessage + ' ' + JSON.stringify(err || {})).toLowerCase();

    if (
      fullErrorStr.includes('uk1e447b96pedrvtxw44ot4qxem') ||
      fullErrorStr.includes('clé dupliquée') ||
      fullErrorStr.includes('cle dupliquee') ||
      fullErrorStr.includes('duplicate key') ||
      fullErrorStr.includes('existe déjà') ||
      fullErrorStr.includes('already exists') ||
      fullErrorStr.includes('contrainte unique') ||
      fullErrorStr.includes('unique constraint')
    ) {
      return 'Project Existed';
    }

    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'An error occurred while creating the project.';
  }
  goToProjectDetail(project: Project): void {
    if (project.id == null) {
      return;
    }
    this.router.navigate(['/project', project.id]);
  }

  
}