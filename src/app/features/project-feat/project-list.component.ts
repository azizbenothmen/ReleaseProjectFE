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
    // Sécurité : on remet le scroll si le composant est détruit avec le modal ouvert
    document.body.style.overflow = '';
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

  // Empêche la fermeture quand on clique DANS le modal (utilisé avec (click)="$event.stopPropagation()" côté template,
  // mais gardé ici si besoin de logique additionnelle plus tard)
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

  /**
   * Navigue vers la page d'import de repo en passant l'id du projet
   * en paramètre de route. La page cible le récupère via ActivatedRoute
   * et l'utilise pour appeler l'endpoint d'import (ex: POST /projects/{id}/import-repo)
   */
  goToImportRepo(project: Project): void {
    this.router.navigate(['/repo', project.id]);
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