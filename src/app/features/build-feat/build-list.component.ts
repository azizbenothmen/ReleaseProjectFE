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
          this.errorMessage = 'Unable to determine the owner user.';
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

  deletingId: string | number | null = null;
  showDeleteModal: boolean = false;
  buildToDelete: Build | null = null;

  goToBuildDetail(build: Build): void {
    if (!build.id) return;
    this.router.navigate(['/owner', this.owner, 'builds', build.id]);
  }

  openDeleteModal(event: Event, build: Build): void {
    event.stopPropagation();
    if (!build.id) return;
    this.buildToDelete = build;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.buildToDelete = null;
  }

  confirmDelete(): void {
    if (!this.buildToDelete?.id) return;
    const buildId = this.buildToDelete.id;

    this.deletingId = buildId;
    this.buildService.deleteBuild(buildId).subscribe({
      next: () => {
        this.builds = this.builds.filter(b => b.id !== buildId);
        this.deletingId = null;
        this.closeDeleteModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting build:', err);
        this.builds = this.builds.filter(b => b.id !== buildId);
        this.deletingId = null;
        this.closeDeleteModal();
        this.cdr.detectChanges();
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
    if (time == null || time === '') return 'Not specified';

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
      return 'Not specified';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  private extractErrorMessage(err: any): string {
    if (err.error?.message) {
      return err.error.message;
    }
    if (typeof err.error === 'string') {
      return err.error;
    }
    return err.message || 'Unable to fetch builds for this owner.';
  }
}
