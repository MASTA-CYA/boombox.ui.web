import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { PlaylistTrack } from '../../../playlist/models/playlist-track';
import { LibraryService } from '../../../../services/library.service';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../../../services/player.service';
import { ModalService } from '../../../../services/modal.service';
import { EqualizerComponent } from '../equalizer/equalizer.component';
import { ModalButtonConfig, ModalButtonType, ModalConfig } from '../../../modal/models/modal';

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


  constructor(private libraryService: LibraryService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private playerService: PlayerService,
    private modalService: ModalService
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
      this.retriggerIconsAnimation();
      this.cdRef.markForCheck();
    }, 0);
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
}
