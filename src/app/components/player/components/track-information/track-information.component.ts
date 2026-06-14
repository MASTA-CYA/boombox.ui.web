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
      this.cdRef.markForCheck();
    }, 0);
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
