import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PlayerComponent } from '../player/player.component';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ServerService } from '../../services/server.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, PlayerComponent, SvgIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  isServerRunning: boolean = false;
  serverSubscription: Subscription | undefined;

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

  constructor(private httpClient: HttpClient, private serverService: ServerService) { }

  async ngOnInit(): Promise<void> {
    this.serverSubscription = this.serverService.serverConnected$.subscribe(async () => {
      this.isServerRunning = await this.serverService.isServerRunningAsync()
    });
  }

  ngOnDestroy(): void {
    if (this.serverSubscription)
      this.serverSubscription.unsubscribe();
  }

  async onPowerToggled(): Promise<void> {
    const action = this.isServerRunning ? environment.stopServerUrl : environment.startServerUrl;
    this.httpClient.post(action, null).subscribe({
      next: (response) => console.log('Server actions triggered', response),
      error: (err) => console.error('Error during server action', err)
    });

    if (!this.isServerRunning) {
      setTimeout(async () => {
        await this.serverService.startConnectionAsync();
      }, 3000);
    }
  }

  onRestartClicked(): void {
    this.httpClient.post(environment.restartServerUrl, null).subscribe({
      next: (response) => console.log('Server restart triggered', response),
      error: (err) => console.error('Error during restart', err)
    });
  }
}
