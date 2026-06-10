import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { PlayerService } from '../../../../services/player.service';
import { PlayerState } from '../../models/player-state';
import { Subscription } from 'rxjs';
import { IPlayerState } from '../../interfaces/player-state';

@Component({
  selector: 'app-player-actions',
  imports: [MatButtonModule, SvgIconComponent],
  templateUrl: './player-actions.component.html',
  styleUrl: './player-actions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerActionsComponent implements OnInit, OnDestroy {
  @Output() showPlaylist = new EventEmitter<boolean>();
  isPlaylistVisible: boolean = false;

  public playerState: PlayerState | undefined;
  private playerActionsSubscription!: Subscription;

  constructor(private playerService: PlayerService,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef) { }

  async ngOnInit(): Promise<void> {
    this.playerActionsSubscription = this.playerService.playerState$.subscribe((state) =>
      this.ngZone.runOutsideAngular(() => this.handlePlayerStateUpdates(state)));
  }

  ngOnDestroy(): void {
    if (this.playerActionsSubscription)
      this.playerActionsSubscription.unsubscribe();
  }

  togglePlaylist(): void {
    this.isPlaylistVisible = !this.isPlaylistVisible;
    this.showPlaylist.emit(this.isPlaylistVisible);
  }

  async playPrevious(): Promise<void> {
    await this.playerService.playPreviousAsync();
  }

  async playNext(): Promise<void> {
    await this.playerService.playNextAsync();
  }

  async playPauseAsync(action: string): Promise<void> {
    if (action === "play")
      await this.playerService.playAsync();
    else
      await this.playerService.pauseAsync();
  }

  async togglePlayerModeAsync(): Promise<void> {
    await this.playerService.togglePlayerModeAsync();
  }

  private handlePlayerStateUpdates(state: IPlayerState): void {
    const hasNextChanged = this.playerState?.hasNext != state.hasNext;
    const isPlayingChanged = this.playerState?.isPlaying != state.isPlaying;
    const hasPreviousChanged = this.playerState?.hasPrevious != state.hasPrevious;
    const hasModeChanged = this.playerState?.mode != state.mode;

    if (hasNextChanged || isPlayingChanged || hasPreviousChanged || hasModeChanged) {
      setTimeout(() => {
        this.playerState = new PlayerState(state);
        this.cdRef.markForCheck();
      }, 0);
    }
  }
}
