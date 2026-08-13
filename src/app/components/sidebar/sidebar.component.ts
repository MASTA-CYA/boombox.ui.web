import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PlayerComponent } from '../player/player.component';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ServerService } from '../../services/server.service';
import { PlayerService } from '../../services/player.service';
import { Subscription } from 'rxjs';
import { ServerUpdate } from './models/server-update';

// Mirrors the backend's MusicPlayer.Player.Models.AudioOutput enum (0 = Speakers, 1 = Headset).
const AUDIO_OUTPUT_SPEAKERS = 0;
const AUDIO_OUTPUT_HEADSET = 1;

@Component({
  selector: 'app-sidebar',
  imports: [RouterModule, PlayerComponent, SvgIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  version: String = "";
  isServerRunning: boolean = false;
  serverSubscription: Subscription | undefined;

  audioOutput: number = AUDIO_OUTPUT_SPEAKERS;
  playerStateSubscription: Subscription | undefined;
  protected readonly audioOutputSpeakers = AUDIO_OUTPUT_SPEAKERS;
  protected readonly audioOutputHeadset = AUDIO_OUTPUT_HEADSET;

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

  constructor(private httpClient: HttpClient, private serverService: ServerService, private playerService: PlayerService) { }

  async ngOnInit(): Promise<void> {
    this.serverSubscription = this.serverService.serverConnected$.subscribe(async (update: ServerUpdate) => {
      this.isServerRunning = await this.serverService.isServerRunningAsync();
      this.version = update.version;
    });

    this.playerStateSubscription = this.playerService.playerState$.subscribe((state) => {
      this.audioOutput = state.audioOutput;
    });
  }

  ngOnDestroy(): void {
    if (this.serverSubscription)
      this.serverSubscription.unsubscribe();

    if (this.playerStateSubscription)
      this.playerStateSubscription.unsubscribe();
  }

  async onSpeakersClicked(): Promise<void> {
    await this.playerService.setAudioOutputAsync(AUDIO_OUTPUT_SPEAKERS);
  }

  async onHeadphonesClicked(): Promise<void> {
    await this.playerService.setAudioOutputAsync(AUDIO_OUTPUT_HEADSET);
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
