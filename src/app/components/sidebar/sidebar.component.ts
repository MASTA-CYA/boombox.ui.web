import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PlayerComponent } from '../player/player.component';
import { SvgIconComponent } from '@ngneat/svg-icon';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, PlayerComponent, SvgIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  activeLink: string | null = null;
  items = [
    {
      routeLink: 'library',
      icon: 'cd',
      label: 'Library',
    },
    {
      routeLink: 'playlist',
      icon: 'playlist',
      label: 'Playlists',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
  ];
}
