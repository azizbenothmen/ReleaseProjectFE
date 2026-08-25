import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BuildService } from '../../core/services/build.service';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { Build, BuildResult } from '../../core/models/build.model';

@Component({
  selector: 'app-build-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './build-list.component.html',
  styleUrls: ['./build-list.component.css']
})
export class BuildListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private buildService = inject(BuildService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  owner: string = '';
  builds: Build[] = [];
  loading: boolean = true;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const ownerParam = params.get('owner');
      if (ownerParam) {
        this.owner = ownerParam;
        this.fetchBuilds(this.owner);
      } else {
        this.resolveCurrentOwner();
      }
    });
  }

  private resolveCurrentOwner(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser?.username) {
      this.owner = currentUser.username;
      this.fetchBuilds(this.owner);
    } else {
      this.projectService.getCurrentUser().subscribe({
        next: (user) => {
          this.owner = user.username;
          this.fetchBuilds(this.owner);
        },
        error: (err) => {
          this.errorMessage = 'Impossible de déterminer l’utilisateur propriétaire.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  fetchBuilds(owner: string): void {
    this.loading = true;
    this.errorMessage = null;

    this.buildService.getBuildsByOwner(owner).subscribe({
      next: (data) => {
        this.builds = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = this.extractErrorMessage(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToBuildDetail(build: Build): void {
    if (!build.id) return;
    this.router.navigate(['/owner', this.owner, 'builds', build.id]);
  }

  getBadgeClass(status: BuildResult | undefined): string {
    if (!status) return 'badge-gray';
    const s = status.toUpperCase();
    switch (s) {
      case 'SUCCESS':
        return 'badge-success';
      case 'FAILURE':
        return 'badge-danger';
      case 'UNSTABLE':
        return 'badge-warning';
      case 'ABORTED':
      case 'BUILDING':
      case 'IN_PROGRESS':
      default:
        return 'badge-gray';
    }
  }

  formatDuration(duration: number | string | null | undefined): string {
    if (duration == null || duration === '') return 'N/A';
    
    let ms: number;
    if (typeof duration === 'string') {
      ms = parseInt(duration, 10);
    } else {
      ms = duration;
    }

    if (isNaN(ms) || ms < 0) return 'N/A';

    const totalSeconds = ms > 100000 ? Math.floor(ms / 1000) : Math.floor(ms);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
    return `${seconds}s`;
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'Impossible de récupérer les builds pour cet owner.';
  }
}
