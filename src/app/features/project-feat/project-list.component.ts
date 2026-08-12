import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { Project, ProjectStatus } from '../../core/models/project.model';

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
  formErrorMessage: string | null = null;
  deletingId: number | string | null = null;

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

    this.projectService.getProjects().subscribe({
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
    this.router.navigate(['projet/repo', project.id]);
  }

  deleteProject(project: Project): void {
    if (project.id == null) {
      this.showNotification('error', 'Invalid project (missing identifier).');
      return;
    }

    this.deletingId = project.id;

    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.projects = this.projects.filter(p => p.id !== project.id);
        this.deletingId = null;
        this.showNotification('success', 'Project deleted successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.deletingId = null;
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
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'An error occurred while creating the project.';
  }
}