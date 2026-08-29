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
        this.errorMessage = 'Missing build ID.';
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

  showDeleteModal: boolean = false;

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    if (!this.buildId) return;

    this.buildService.deleteBuild(this.buildId).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.goBack();
      },
      error: (err) => {
        console.error('Error deleting build:', err);
        this.closeDeleteModal();
        this.goBack();
      }
    });
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

  getBuildDate(build: any): string | null {
    if (!build) return null;
    const val = build.time ?? build.timestamp ?? build.date ?? build.createdAt ?? build.startTime;
    if (val == null || val === '') return null;
    return this.formatDate(val);
  }

  getBuildDuration(build: any): string | null {
    if (!build) return null;
    const val = build.duration ?? build.durationMs ?? build.executionTime;
    if (val == null || val === '') return null;
    return this.formatDuration(val);
  }

  formatDuration(duration: number | string | null | undefined): string {
    if (duration == null || duration === '') return 'N/A';
    
    let ms = typeof duration === 'string' ? parseFloat(duration) : duration;
    if (isNaN(ms) || ms < 0) return 'N/A';
    if (ms === 0) return '0s';

    let totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds === 0 && ms > 0) {
      return `${Math.round(ms)}ms`;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    }
    return `${seconds}s`;
  }

  formatDate(time: string | number | null | undefined): string {
    if (time == null || time === '') return 'Not available';

    let dateObj: Date;

    if (typeof time === 'number') {
      const ms = time < 10000000000 ? time * 1000 : time;
      dateObj = new Date(ms);
    } else if (typeof time === 'string') {
      const trimmed = time.trim();
      if (/^\d+$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        const ms = num < 10000000000 ? num * 1000 : num;
        dateObj = new Date(ms);
      } else {
        const isoString = trimmed.includes(' ') && !trimmed.includes('T')
          ? trimmed.replace(' ', 'T')
          : trimmed;
        dateObj = new Date(isoString);
      }
    } else {
      dateObj = new Date(time);
    }

    if (isNaN(dateObj.getTime())) {
      return 'Not available';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'Unable to fetch build details.';
  }
}
