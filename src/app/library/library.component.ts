import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent {
  items = [
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
    {
      routeLink: 'library',
      icon: 'library_music',
      label: 'Library',
    },
    {
      routeLink: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
  ];
}
