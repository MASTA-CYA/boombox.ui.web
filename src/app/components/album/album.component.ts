import { Component, inject, Input, OnDestroy, OnInit, Signal } from '@angular/core';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { DomSanitizer } from '@angular/platform-browser';
import { Album } from '../library/models/album';
import { LibraryService } from '../../services/library.service';
import { PlayerService } from '../../services/player.service';
import { SnackbarService } from '../../services/snackbar.service';
import { PlaylistService } from '../../services/playlist.service';
import { IPlaylist } from '../playlist/interfaces/playlist';
import { Subscription } from 'rxjs';
import { Playlist } from '../playlist/models/playlist';
import { UserTrackData } from '../library/models/user-track-data';
import { Constants } from '../../common/constants';

@Component({
  selector: 'app-album',
  imports: [SvgIconComponent, MatButtonModule, MatListModule],
  templateUrl: './album.component.html',
  styleUrl: './album.component.css'
})
export class AlbumComponent implements OnInit, OnDestroy {
  public album: Album | undefined;
  private selectedTracks: string[] = [];
  public playlists: IPlaylist[] | undefined;
  public playlistNames: string[] | undefined;
  public selectedPlaylistTracks: string[] | undefined;
  public selectedPlaylistTrack: string | undefined;
  public selectedPlaylist: Playlist | undefined;
  public showPlaylists: boolean | undefined;

  private playlistSubscription: Subscription | undefined;
  private userTrackDataSubscription: Subscription | undefined;

  constructor(private libraryService: LibraryService,
    private playerService: PlayerService,
    private snackbarService: SnackbarService,
    private playlistService: PlaylistService,
    private domSanitizer: DomSanitizer,) { }

  async ngOnInit(): Promise<void> {
    this.album = this.libraryService.getSelectedAlbum();

    if (!this.album) {
      const cachedAlbum = await this.libraryService.getCachedSelectedAlbumAsync();
      this.album = new Album(this.domSanitizer, cachedAlbum!);
    }

    this.playlistSubscription = this.playlistService.playlists$.subscribe(playlists => this.handlePlaylistsChange(playlists))
    this.userTrackDataSubscription = this.libraryService.userTrackData$.subscribe(track => this.handleUserTrackDataUpdated(track))
  }

  ngOnDestroy(): void {
    if (this.playlistSubscription)
      this.playlistSubscription.unsubscribe();

    if (this.userTrackDataSubscription)
      this.userTrackDataSubscription.unsubscribe();
  }

  async onPlayAllClicked(): Promise<void> {
    const paths = this.selectedTracks.length != 0
      ? this.selectedTracks : this.album?.tracks.map(track => track.path);

    if (!paths) {
      this.snackbarService.showMessage('No paths to play', 'Invalid paths')
      return;
    }

    await this.playerService.playAsync(paths ?? []);
    this.resetCheckboxes();
  }

  resetCheckboxes(): void {
    const allCheckboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    allCheckboxes.forEach((cb) => {
      cb.checked = false;
    });
  }

  onSelectedTrackChanged(event: any): void {
    if (event.target.checked)
      this.selectedTracks.push(event.target.value)
    else
      this.selectedTracks.splice(this.selectedTracks.indexOf(event.target.value), 1);

    console.log(this.selectedTracks)
  }

  private handlePlaylistsChange(playlists: IPlaylist[]): void {
    this.playlists = playlists.map(playlist => new Playlist(playlist))
    this.playlistNames = this.playlists.map(playlist => playlist.name);
    this.selectedPlaylist = this.playlists.find(playlist => playlist.name === this.selectedPlaylist?.name);
    this.selectedPlaylistTracks = this.playlists.find(playlist => playlist.name === this.selectedPlaylist?.name)?.tracks?.map(track => track.name);

    if (this.selectedPlaylist) {
      setInterval(() => {
        const selectedPlaylistRadioButton = document.getElementById(this.selectedPlaylist!.name) as HTMLInputElement;
        selectedPlaylistRadioButton.checked = true;

        if (this.selectedPlaylistTrack) {
          const selectedPlaylistRadioButton = document.getElementById(this.selectedPlaylistTrack) as HTMLInputElement;
          selectedPlaylistRadioButton.checked = true;
        }
      }, 0);
    }
  }

  private handleUserTrackDataUpdated(trackData: UserTrackData) {
    let track = this.album?.tracks.find(track => track.path === trackData.path)

    if (!track)
      console.log("Unable to find track for user data update");

    track!.isFavourite = trackData.isFavourite;
    track!.timesPlayed = trackData.timesPlayed;
  }

  onPlaylistSelected(name: string): void {
    const playlist = this.playlists?.find(playlist => playlist.name === name);
    this.selectedPlaylistTracks = playlist?.tracks.map(track => track.name)
    this.selectedPlaylist = playlist;
  }

  onPlaylistTrackSelected(name: string): void {
    this.selectedPlaylistTrack = this.selectedPlaylist?.tracks.find(track => track.name === name)?.path
  }

  onShowPlaylistsClicked(): void {
    if (!this.showPlaylists)
      this.showPlaylists = !this.showPlaylists;
  }

  onCancelClicked(): void {
    if (this.showPlaylists)
      this.showPlaylists = !this.showPlaylists;
  }

  async onPrependClicked(): Promise<void> {
    if (this.selectedPlaylist?.name === Constants.nowPlaying)
      await this.playerService.addToNowPlayingAsync(this.selectedTracks, false, this.selectedPlaylistTrack);
  }

  async onAppendClicked(): Promise<void> {
    if (this.selectedPlaylist?.name === Constants.nowPlaying)
      await this.playerService.addToNowPlayingAsync(this.selectedTracks, true, this.selectedPlaylistTrack);
  }

  isPlaying(name: string) {
    return this.selectedPlaylist?.tracks.find(track => track.name === name)?.isPlaying;
  }

  async onMarkAsFavouriteClicked(path: string): Promise<void> {
    await this.libraryService.markAsFavouriteAsync(path);
  }
}
