import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PlayerComponent } from '../player/player.component';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, MatIconModule, PlayerComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  activeLink: string | null = null;
  items = [
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'playlist',
      icon: 'queue_music',
      label: 'Playlists',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
  ];
}
