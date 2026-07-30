import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface StatCard {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent {
  activeNav: 'projet' | 'repo' = 'projet';
private readonly authService = inject(AuthService);


  stats: StatCard[] = [
    { label: 'Projets actifs',  value: '12',    delta: '+2 ce mois',   positive: true },
    { label: 'Dépôts',          value: '34',    delta: '+5 ce mois',   positive: true },
    { label: 'Commits (30j)',   value: '1 204', delta: '+18%',         positive: true },
    { label: 'Builds échoués',  value: '3',     delta: '-1 vs hier',   positive: true },
  ];

  setNav(section: 'projet' | 'repo'): void {
    this.activeNav = section;
  }

  logout(): void {
        this.authService.logout();
;
  }
}