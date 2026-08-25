import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BuildService } from '../../core/services/build.service';
import { Build, BuildResult } from '../../core/models/build.model';

@Component({
  selector: 'app-build-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './build-detail.component.html',
  styleUrls: ['./build-detail.component.css']
})
export class BuildDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private buildService = inject(BuildService);
  private cdr = inject(ChangeDetectorRef);

  owner: string = '';
  buildId: string = '';
  build: Build | null = null;
  loading: boolean = true;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.owner = params.get('owner') || '';
      this.buildId = params.get('id') || '';
      if (this.owner && this.buildId) {
        this.fetchBuildDetails(this.owner, this.buildId);
      } else {
        this.errorMessage = 'Identifiant de build manquant.';
        this.loading = false;
      }
    });
  }

  fetchBuildDetails(owner: string, buildId: string): void {
    this.loading = true;
    this.errorMessage = null;

    this.buildService.getBuildById(owner, buildId).subscribe({
      next: (data) => {
        this.build = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        const stateBuild = history.state?.build;
        if (stateBuild) {
          this.build = stateBuild;
        } else {
          this.errorMessage = this.extractErrorMessage(err);
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    if (this.owner) {
      this.router.navigate(['/owner', this.owner, 'builds']);
    } else {
      this.router.navigate(['/projects']);
    }
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
    return err.message || 'Impossible de récupérer les détails du build.';
  }
}
