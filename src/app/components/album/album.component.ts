import { Component, inject, Input, OnDestroy, OnInit, SecurityContext, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { DomSanitizer } from '@angular/platform-browser';
import { Album } from '../library/models/album';
import { LibraryService } from '../../services/library.service';
import { PlayerService } from '../../services/player.service';
import { SnackbarService } from '../../services/snackbar.service';
import { Subscription } from 'rxjs';
import { UserTrackData } from '../library/models/user-track-data';
import { Track } from '../library/models/track';
import { AlbumPlaylistComponent } from "./components/album-playlist/album-playlist.component";
import { AlbumSearchBarComponent } from './components/album-search-bar/album-search-bar.component';
import { ITrack } from '../library/interfaces/track';

@Component({
  selector: 'app-album',
  imports: [SvgIconComponent, MatButtonModule, MatListModule, CommonModule, AlbumPlaylistComponent, AlbumSearchBarComponent],
  templateUrl: './album.component.html',
  styleUrl: './album.component.css'
})
export class AlbumComponent implements OnInit, OnDestroy {
  public album: Album | undefined;
  public displayTracks: Track[] | undefined;
  selectedTracks: string[] = [];
  public showPlaylists: boolean = false;
  
  private userTrackDataSubscription: Subscription | undefined;

  constructor(private libraryService: LibraryService,
    private playerService: PlayerService,
    private snackbarService: SnackbarService,
    private domSanitizer: DomSanitizer
  ) { }

  async ngOnInit(): Promise<void> {
    this.album = this.libraryService.getSelectedAlbum();
    this.displayTracks = this.album?.tracks;


    if (!this.album) {
      const cachedAlbum = await this.libraryService.getCachedSelectedAlbumAsync();
      this.album = new Album(this.domSanitizer, cachedAlbum!);
      this.displayTracks = this.album.tracks;
    }
    const imageUrl = this.domSanitizer.sanitize(SecurityContext.URL, this.album.displayImage);
    const albumHeader = document.getElementById("albumHeader") as HTMLInputElement;
    albumHeader.style.backgroundImage = `url('${imageUrl}')`;

    this.userTrackDataSubscription = this.libraryService.userTrackData$.subscribe(track => this.handleUserTrackDataUpdated(track))
  }

  ngOnDestroy(): void {
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
    this.selectedTracks = [];
  }

  resetCheckboxes(): void {
    const allCheckboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id^="album_"]');
    allCheckboxes.forEach((cb) => {
      cb.checked = false;
    });
  }

  onSelectedTrackChanged(event: any): void {
    if (event.target.checked)
      this.selectedTracks.push(event.target.value)
    else
      this.selectedTracks.splice(this.selectedTracks.indexOf(event.target.value), 1);
  }

  private handleUserTrackDataUpdated(trackData: UserTrackData) {
    let track = this.album?.tracks.find(track => track.path === trackData.path)

    if (!track)
      console.log("Unable to find track for user data update");

    track!.isFavourite = trackData.isFavourite;
    track!.timesPlayed = trackData.timesPlayed;
  }

  onShowPlaylistsClicked(): void {
    if (!this.showPlaylists)
      this.showPlaylists = !this.showPlaylists;
  }

  hidePlaylists(): void {
    this.showPlaylists = false;
  }

  onTrackDoubleClick(path: string): void {
    if (this.selectedTracks.find(track => track === path))
      this.selectedTracks.splice(this.selectedTracks.indexOf(path), 1);
    else
      this.selectedTracks.push(path);

    setTimeout(() => {
      const allCheckboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][id^="album_"]');
      allCheckboxes.forEach((cb) => {
        if (this.selectedTracks.includes(cb.value))
          cb.checked = true;
        else
          cb.checked = false;
      });
    }, 0);
  }

  getTracksByDiscNumber(disc: number): Track[] | undefined {
    return this.album?.tracks.filter(track => track.discNumber == disc);
  }

  async onMarkAsFavouriteClicked(path: string): Promise<void> {
    await this.libraryService.markAsFavouriteAsync(path);
  }

  filterTracks(text: string): void {
    this.displayTracks = this.album?.tracks.filter(track => track.name.toLowerCase().includes(text.toLowerCase()) || track.artist.toLowerCase().includes(text.toLowerCase()));
  }
}
