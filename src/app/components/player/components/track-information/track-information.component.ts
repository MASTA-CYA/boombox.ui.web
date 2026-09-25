import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { PlaylistTrack } from '../../../playlist/models/playlist-track';
import { LibraryService } from '../../../../services/library.service';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../../../services/player.service';
import { ModalService } from '../../../../services/modal.service';
import { EqualizerComponent } from '../equalizer/equalizer.component';
import { LyricsComponent } from '../lyrics/lyrics.component';
import { ModalButtonConfig, ModalButtonType, ModalConfig } from '../../../modal/models/modal';
import { UserTrackData } from '../../../library/models/user-track-data';

@Component({
  selector: 'app-track-information',
  imports: [SvgIconComponent],
  templateUrl: './track-information.component.html',
  styleUrl: './track-information.component.css'
})
export class TrackInformationComponent implements OnInit, OnDestroy {
  public playingTrack: PlaylistTrack | undefined;
  public playIconsAnimation = true;
  private playlistTrackSubscription!: Subscription;
  private userTrackDataSubscription!: Subscription;


  constructor(private libraryService: LibraryService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private playerService: PlayerService,
    private modalService: ModalService
  ) { }

  async ngOnInit(): Promise<void> {
    this.playlistTrackSubscription = this.playerService.trackInfoPlayingTrack$.subscribe((track) =>
      this.ngZone.runOutsideAngular(() => this.handlePlayingTrackUpdates(track)));

    // trackInfoPlayingTrack$ only fires on an actual track change (see its broadcast comment in
    // PlayerService), so a favourite toggled elsewhere - e.g. from the album view, which goes through
    // LibraryService directly rather than the queued-playlist path Player.cs mutates - never reaches this
    // component's playingTrack.isFavourite without a dedicated subscription. Same pattern SeekBarComponent
    // already uses for the same reason.
    this.userTrackDataSubscription = this.libraryService.userTrackData$.subscribe(track => this.handleUserTrackDataUpdated(track));
  }

  ngOnDestroy(): void {
    if (this.playlistTrackSubscription)
      this.playlistTrackSubscription.unsubscribe();

    if (this.userTrackDataSubscription)
      this.userTrackDataSubscription.unsubscribe();
  }

  async onMarkAsFavouriteClicked(path: string | undefined): Promise<void> {
    if (path)
      await this.libraryService.markAsFavouriteAsync(path);
  }

  private handlePlayingTrackUpdates(track: PlaylistTrack) {
    setTimeout(() => {
      this.playingTrack = track;
      this.retriggerIconsAnimation();
      this.cdRef.markForCheck();
    }, 0);
  }

  private handleUserTrackDataUpdated(trackData: UserTrackData): void {
    if (this.playingTrack?.path !== trackData.path) return;
    this.playingTrack.isFavourite = trackData.isFavourite;
    this.cdRef.markForCheck();
  }

  // Restarting a CSS animation by re-adding the same class doesn't work - the browser needs a
  // style recalculation/paint to land in between the removal and the re-addition, otherwise the two
  // get batched together and nothing visibly restarts. A single requestAnimationFrame isn't reliably
  // enough of a gap for this either, so we wait two frames before flipping the class back on.
  private retriggerIconsAnimation(): void {
    this.playIconsAnimation = false;
    this.cdRef.markForCheck();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.playIconsAnimation = true;
        this.cdRef.markForCheck();
      });
    });
  }

  public onOpenEqualizerClicked(): void {
    const projectedInstance = this.modalService.projectComponent(EqualizerComponent);
    if (!projectedInstance) return;
    this.modalService.openDialog(new ModalConfig("Equalizer", [
      new ModalButtonConfig("Reset", "undo", "#0000FF", ModalButtonType.primary, () => projectedInstance!.instance.reset()),
      new ModalButtonConfig("Apply", "save", "#710193", ModalButtonType.primary, () => projectedInstance!.instance.apply())
    ]));
  }

  // Title is the fixed "Lyrics" label - unlike the equalizer, which always edits "the current preset", this
  // dialog is about one particular track's content, so the track name is shown as the dialog's own first line
  // (LyricsComponent's trackName input) rather than doubling up as the modal chrome's title too.
  //
  // The footer's Save button is populated dynamically instead of once at open time, because whether it's even
  // relevant depends on LyricsComponent's async load result (found vs. not found) - re-calling openDialog()
  // after the dialog is already open only refreshes the header/footer config, it does not disturb the
  // already-projected component's body (confirmed behaviour of ModalService/ModalComponent).
  public onOpenLyricsClicked(): void {
    if (!this.playingTrack?.path) return;

    const projectedInstance = this.modalService.projectComponent(LyricsComponent);
    if (!projectedInstance) return;

    projectedInstance.instance.trackPath = this.playingTrack.path;
    projectedInstance.instance.trackName = this.playingTrack.name ?? "";

    const buildConfig = (hasLyrics: boolean) => new ModalConfig("Lyrics", hasLyrics ? [] : [
      new ModalButtonConfig("Save", "save", "#710193", ModalButtonType.primary, () => projectedInstance!.instance.onSaveManualLyricsClicked())
    ]);

    // No lyrics-found state yet while the dialog first loads, so open without the Save button - it appears
    // only once LyricsComponent confirms nothing was found automatically, and disappears again after a
    // successful manual save.
    this.modalService.openDialog(buildConfig(true));
    projectedInstance.instance.lyricsFound.subscribe((found: boolean) => this.modalService.openDialog(buildConfig(found)));
  }
}
