import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { PlaylistTrack } from '../../../playlist/models/playlist-track';
import { LibraryService } from '../../../../services/library.service';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../../../services/player.service';
import { IPlaylistTrack } from '../../../playlist/interfaces/playlist-track';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-track-information',
  imports: [SvgIconComponent],
  templateUrl: './track-information.component.html',
  styleUrl: './track-information.component.css'
})
export class TrackInformationComponent implements OnInit, OnDestroy {
  public playingTrack: PlaylistTrack | undefined;
  private playlistTrackSubscription!: Subscription;


  constructor(private libraryService: LibraryService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private playerService: PlayerService
  ) { }

  async ngOnInit(): Promise<void> {
    this.playlistTrackSubscription = this.playerService.trackInfoPlayingTrack$.subscribe((track) =>
      this.ngZone.runOutsideAngular(() => this.handlePlayingTrackUpdates(track)));
  }

  ngOnDestroy(): void {
    if (this.playlistTrackSubscription)
      this.playlistTrackSubscription.unsubscribe();
  }

  async onMarkAsFavouriteClicked(path: string | undefined): Promise<void> {
    if (path)
      await this.libraryService.markAsFavouriteAsync(path);
  }

  private handlePlayingTrackUpdates(track: PlaylistTrack) {
    setTimeout(() => {
      this.playingTrack = track;
      this.cdRef.markForCheck();
    }, 0);
  } 
}
