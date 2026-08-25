import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  owner: string = '';

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user?.username) {
      this.owner = user.username;
    } else {
      this.projectService.getCurrentUser().subscribe({
        next: (u) => {
          if (u?.username) {
            this.owner = u.username;
          }
        },
        error: () => {}
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}