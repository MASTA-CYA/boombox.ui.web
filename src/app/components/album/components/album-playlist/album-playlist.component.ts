import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { Playlist } from '../../../playlist/models/playlist';
import { Constants } from '../../../../common/constants';
import { PlayerService } from '../../../../services/player.service';
import { PlaylistService } from '../../../../services/playlist.service';
import { SnackbarService } from '../../../../services/snackbar.service';
import { IPlaylist } from '../../../playlist/interfaces/playlist';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-album-playlist',
  imports: [SvgIconComponent, MatButtonModule, MatListModule, CommonModule],
  templateUrl: './album-playlist.component.html',
  styleUrl: './album-playlist.component.css'
})
export class AlbumPlaylistComponent implements OnInit, OnDestroy, OnChanges {
  @Input() showPlaylists: boolean = false;
  @Input() selectedTracks: string[] = [];

  @Output() resetCheckboxes = new EventEmitter();
  @Output() hidePlaylists = new EventEmitter();

  @ViewChild('tracksContainer') private tracksContainer!: ElementRef;

  public selectedPlaylistTracks: string[] | undefined;
  public selectedPlaylistTrack: string | undefined;
  public selectedPlaylist: Playlist | undefined;
  public playlists: IPlaylist[] | undefined;
  public playlistNames: string[] | undefined;
  public playingTrackIndex: number = 0;

  private playlistSubscription: Subscription | undefined;

  constructor(private playerService: PlayerService,
    private snackbarService: SnackbarService,
    private playlistService: PlaylistService
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showPlaylists']) {
      setTimeout(() => {
        if (this.showPlaylists) {
          const container = this.tracksContainer.nativeElement;
          container.scrollTop = container.scrollHeight;

          this.selectedPlaylist = this.playlists?.at(0);
          this.selectedPlaylistTracks = this.playlists?.find(playlist => playlist.name === this.selectedPlaylist?.name)?.tracks?.map(track => track.name);
          if (this.selectedPlaylist) {
            const selectedPlaylistRadioButton = document.getElementById(this.selectedPlaylist.name) as HTMLInputElement;
            selectedPlaylistRadioButton.checked = true;
          }

          this.selectedPlaylistTrack = this.selectedPlaylist?.tracks.find(track => track.isPlaying)?.path;
          if (this.selectedPlaylistTrack)
            this.playingTrackIndex = this.selectedPlaylist?.tracks.findIndex(track => track.path === this.selectedPlaylistTrack) ?? 0;

          setTimeout(() => {
            const playingTrack = this.selectedPlaylist?.tracks?.find(track => track.path == this.selectedPlaylistTrack)?.name;
            if (playingTrack) {
              const selectedPlaylistTrackRadioButton = document.getElementById(playingTrack) as HTMLInputElement;
              selectedPlaylistTrackRadioButton.checked = true;
            }
          }, 0);
        }
      }, 0);
    }
  }

  ngOnInit(): void {
    this.playlistSubscription = this.playlistService.playlists$.subscribe(playlists => this.handlePlaylistsChange(playlists))
  }

  ngOnDestroy(): void {
    if (this.playlistSubscription)
      this.playlistSubscription.unsubscribe();
  }

  private handlePlaylistsChange(playlists: IPlaylist[]): void {
    this.playlists = playlists.map(playlist => new Playlist(playlist))
    this.playlistNames = this.playlists.map(playlist => playlist.name);
    this.selectedPlaylist = this.playlists.find(playlist => playlist.name === this.selectedPlaylist?.name);
    this.selectedPlaylistTracks = this.playlists.find(playlist => playlist.name === this.selectedPlaylist?.name)?.tracks?.map(track => track.name);

    if (this.selectedPlaylist) {
      setTimeout(() => {
        const selectedPlaylistRadioButton = document.getElementById(this.selectedPlaylist!.name) as HTMLInputElement;
        selectedPlaylistRadioButton.checked = true;

        if (this.selectedPlaylistTrack) {
          const selectedPlaylistTrackRadioButton = document.getElementById(this.selectedPlaylistTrack) as HTMLInputElement;
          selectedPlaylistTrackRadioButton.checked = true;
        }
      }, 0);
    }
  }

  onPlaylistSelected(name: string): void {
    const playlist = this.playlists?.find(playlist => playlist.name === name);
    this.selectedPlaylistTracks = playlist?.tracks.map(track => track.name)
    this.selectedPlaylist = playlist;
  }

  onPlaylistTrackSelected(name: string): void {
    this.selectedPlaylistTrack = this.selectedPlaylist?.tracks.find(track => track.name === name)?.path
  }

  async onPrependClicked(): Promise<void> {
    if (!this.selectedPlaylistTrack) {
      this.snackbarService.showMessage("No playlist track selected");
      return;
    }

    if (this.selectedPlaylist?.name === Constants.nowPlaying)
      await this.playerService.addToNowPlayingAsync(this.selectedTracks, false, this.selectedPlaylistTrack);

    setTimeout(() => {
      this.resetCheckboxes.emit();
      this.resetForNextPlaylistTrack();
    }, 0);
  }

  async onAppendClicked(): Promise<void> {
    if (!this.selectedPlaylistTrack) {
      this.snackbarService.showMessage("No playlist track selected");
      return;
    }

    if (this.selectedPlaylist?.name === Constants.nowPlaying)
      await this.playerService.addToNowPlayingAsync(this.selectedTracks, true, this.selectedPlaylistTrack);

    setTimeout(() => {
      this.resetCheckboxes.emit();
      this.resetForNextPlaylistTrack();
    }, 0);
  }

  isPlaying(name: string) {
    return this.selectedPlaylist?.tracks.find(track => track.name === name)?.isPlaying;
  }

  private resetForNextPlaylistTrack(): void {
    if (this.selectedPlaylistTrack) {
      const trackName = this.playlists?.find(playlist => playlist.name === this.selectedPlaylist?.name)?.tracks?.find(track => track.path === this.selectedPlaylistTrack)?.name;
      const selectedPlaylistRadioButton = document.getElementById(trackName!) as HTMLInputElement;

      if (selectedPlaylistRadioButton)
        selectedPlaylistRadioButton.checked = false;
    }
    this.selectedPlaylistTrack = undefined;
    this.selectedTracks = [];
  }

  onCancelClicked(): void {
    this.hidePlaylists.emit();

    setTimeout(() => {
      this.resetCheckboxes.emit();
      this.resetForNextPlaylistTrack();
    }, 0);
  }
}
