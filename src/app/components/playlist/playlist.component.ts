import { Component, OnDestroy, OnInit } from '@angular/core';
import { PlaylistService } from '../../services/playlist.service';
import { IPlaylist } from './interfaces/playlist';
import { Subscription } from 'rxjs';
import { Playlist } from './models/playlist';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { PlaylistTrack } from './models/playlist-track';
import { LibraryService } from '../../services/library.service';
import { UserTrackData } from '../library/models/user-track-data';

@Component({
  selector: 'app-playlist',
  imports: [SvgIconComponent],
  templateUrl: './playlist.component.html',
  styleUrl: './playlist.component.css'
})
export class PlaylistComponent implements OnInit, OnDestroy {
  public playlists: IPlaylist[] | undefined;
  public playlistNames: string[] | undefined;
  public selectedPlaylist: Playlist | undefined;
  public selectedPlaylistTracks: PlaylistTrack[] | undefined;

  private playlistSubscription: Subscription | undefined;
  private userTrackDataSubscription: Subscription | undefined;


  constructor(private playlistService: PlaylistService, private libraryService: LibraryService) { }

  async ngOnInit(): Promise<void> {
    await this.playlistService.getPlaylistsAsync();
    this.playlistSubscription = this.playlistService.playlists$.subscribe(playlists => this.handlePlaylistsUpdated(playlists))
    this.userTrackDataSubscription = this.libraryService.userTrackData$.subscribe(track => this.handleUserTrackDataUpdated(track))
  }

  ngOnDestroy(): void {
    if (this.playlistSubscription)
      this.playlistSubscription.unsubscribe();

    if (this.userTrackDataSubscription)
      this.userTrackDataSubscription.unsubscribe();
  }

  private handlePlaylistsUpdated(playlists: IPlaylist[]) {
    this.playlists = playlists.map(playlist => new Playlist(playlist))
    this.playlistNames = this.playlists.map(playlist => playlist.name);
    this.selectedPlaylist = this.playlists.find(playlist => playlist.name === this.selectedPlaylist?.name);
    this.selectedPlaylistTracks = this.playlists.find(playlist => playlist.name === this.selectedPlaylist?.name)?.tracks.map(track => new PlaylistTrack(track));
  }

  onPlaylistSelected(name: string): void {
    this.selectedPlaylist = this.playlists?.find(playlist => playlist.name === name);
  }

  onSelectedTrackChanged(event: any): void {

  }

  async onMarkAsFavouriteClicked(path: string): Promise<void> {
    await this.libraryService.markAsFavouriteAsync(path);
  }

  private handleUserTrackDataUpdated(trackData: UserTrackData) {
    let matchingTrack = this.selectedPlaylistTracks?.find(track => track.path !== trackData.path)
    if (matchingTrack) return;
    matchingTrack!.isFavourite = trackData.isFavourite;
  }
}
