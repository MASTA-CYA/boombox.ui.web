import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { PlaylistTrack } from '../../../playlist/models/playlist-track';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../../../services/player.service';
import { IPlaylistTrack } from '../../../playlist/interfaces/playlist-track';
import { DomSanitizer } from '@angular/platform-browser';
import { LibraryService } from '../../../../services/library.service';
import { UserTrackData } from '../../../library/models/user-track-data';

@Component({
  selector: 'app-seek-bar',
  imports: [MatSliderModule],
  templateUrl: './seek-bar.component.html',
  styleUrl: './seek-bar.component.css'
})
export class SeekBarComponent implements OnInit, OnDestroy {
  public playingTrack: PlaylistTrack | undefined;
  private playingTrackSubscription!: Subscription;
  private userTrackDataSubscription!: Subscription;

  constructor(private playerService: PlayerService,
    private libraryService: LibraryService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private domSanitizer: DomSanitizer) { }

  async ngOnInit(): Promise<void> {
    this.playingTrackSubscription = this.playerService.seekbarPlayingTrack$.subscribe((track) =>
      this.ngZone.runOutsideAngular(() => this.handlePlayingTrackUpdates(track)));
    this.userTrackDataSubscription = this.libraryService.userTrackData$.subscribe(track => this.handleUserTrackDataUpdated(track));
  }

  ngOnDestroy(): void {
    if (this.playingTrackSubscription)
      this.playingTrackSubscription.unsubscribe();

    if (this.userTrackDataSubscription)
      this.userTrackDataSubscription.unsubscribe();
  }

  private handlePlayingTrackUpdates(track: PlaylistTrack) {
    setTimeout(() => {
      this.playingTrack = track;
      this.cdRef.markForCheck();
    }, 0);
  }

  private handleUserTrackDataUpdated(trackData: UserTrackData) {
    if (this.playingTrack?.path !== trackData.path) return;
    this.playingTrack.isFavourite = trackData.isFavourite;
  }
}
