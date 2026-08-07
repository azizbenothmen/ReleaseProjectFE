import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class ProjectListComponent implements OnInit {

  projects: Project[] = [];
  loading = false;
  errorMessage: string | null = null;

  isPanelOpen = false;
  submitting = false;
  formErrorMessage: string | null = null;

  loadingOwner = false;
  ownerErrorMessage: string | null = null;

  projectForm: FormGroup;
  statusOptions = Object.values(ProjectStatus);

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.maxLength(1000)]],
      status: [ProjectStatus.ACTIVE, Validators.required],
      owner: ['', Validators.required] // rempli automatiquement, jamais saisi par l'utilisateur
    });

    // Le champ owner est verrouillé : rempli par l'API, non modifiable dans le formulaire
    this.projectForm.get('owner')?.disable();
  }

  ngOnInit(): void {
    this.fetchProjects();
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
        this.errorMessage = 'Impossible de charger les projets.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openPanel(): void {
    this.isPanelOpen = true;
    this.formErrorMessage = null;
    this.projectForm.reset({
      name: '',
      description: '',
      status: ProjectStatus.ACTIVE,
      owner: ''
    });
    this.loadCurrentOwner();
  }

  closePanel(): void {
    this.isPanelOpen = false;
    this.formErrorMessage = null;
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
      this.ownerErrorMessage = "Impossible de récupérer l'utilisateur courant.";
      this.loadingOwner = false;
      this.cdr.detectChanges();
    }
  });
}

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.formErrorMessage = 'Veuillez corriger les champs invalides.';
      return;
    }

    const owner = this.projectForm.get('owner')?.value;
    if (!owner) {
      this.formErrorMessage = "L'owner n'a pas pu être déterminé. Réessayez.";
      return;
    }

    this.submitting = true;
    this.formErrorMessage = null;

    const { name, description, status } = this.projectForm.getRawValue();

    this.projectService.createProject({ name, description, status, owner }).subscribe({
      next: () => {
        this.submitting = false;
        this.closePanel();
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
    return err.message || 'Une erreur est survenue lors de la création du projet.';
  }
}