import { ChangeDetectorRef, Component, effect, EventEmitter, Input, OnChanges, OnInit, Output, SecurityContext, SimpleChanges } from '@angular/core';
import { PlaylistTrack } from '../../../playlist/models/playlist-track';
import { PlayerService } from '../../../../services/player.service';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-player-playlist',
  imports: [SvgIconComponent],
  templateUrl: './player-playlist.component.html',
  styleUrl: './player-playlist.component.css'
})
export class PlayerPlaylistComponent implements OnInit, OnChanges {
  @Input() playlist: PlaylistTrack[] | undefined;
  public selectedTrack: PlaylistTrack | undefined;

  // Emits true right after a shift is sent (tells the parent to hold the displayed order steady - see
  // PlayerComponent.receivePlayerPlaylist), then false once the pending window has elapsed and it's safe to
  // resume applying incoming playbackInformation$ updates again.
  @Output() updatePlayerPlaylist = new EventEmitter<boolean>();
  private isReorderPending: boolean = false;

  // Drives [disabled] on the shift/delete buttons directly - replaces the old toggleActionButtons(), which
  // reached into the DOM via document.getElementById to flip .disabled imperatively. That approach couldn't
  // coexist with the new canShiftUp()/canShiftDown() template bindings below (Angular would just overwrite the
  // imperative value on its next change detection pass), so this is now the single source of truth.
  public isActionInProgress: boolean = false;

  constructor(
    private playerService: PlayerService,
    private cdRef: ChangeDetectorRef,
    private domSanitizer: DomSanitizer
  ) {  }

  ngOnInit(): void {
    const playingTrack = this.playlist?.find(track => track.isPlaying);
    if (playingTrack) {
      const imageUrl = this.domSanitizer.sanitize(SecurityContext.URL, playingTrack.displayImage!);
      const albumHeader = document.getElementById("playerArt") as HTMLInputElement;
      albumHeader.style.backgroundImage = `url('${imageUrl}')`;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.selectedTrack) return;

    // playlist reassigns to a fresh array of fresh PlaylistTrack objects on every ~500ms playback tick, not
    // just when the track order/membership actually changes - reacting to every one of those ticks was what
    // caused the visible "reselect" flicker (compounded by @for previously tracking by object identity, which
    // recreated every row's DOM - see the trackBy fix in the template). Comparing path sequences here means
    // this only does anything when the list genuinely changed.
    const change = changes['playlist'];
    const previousPaths = (change?.previousValue as PlaylistTrack[] | undefined)?.map(track => track.path);
    const currentPaths = (change?.currentValue as PlaylistTrack[] | undefined)?.map(track => track.path);
    const hasActuallyChanged = !previousPaths || previousPaths.length !== currentPaths?.length
      || previousPaths.some((path, index) => path !== currentPaths![index]);

    if (!hasActuallyChanged) return;

    setTimeout(() => {
      // selectedTrack may no longer be in the list (e.g. it was just deleted) - guard rather than throw.
      const selectedTrackButton = document.getElementById(`player_playlist_${this.selectedTrack!.path}`) as HTMLInputElement | null;
      if (selectedTrackButton) selectedTrackButton.checked = true;
      this.cdRef.markForCheck();
    }, 0)
  }

  onPlaylistTrackSelected(path: string): void {
    this.selectedTrack = this.playlist?.find(track => track.path === path);
  }

  // Index of the currently-selected track within the displayed playlist, or -1 if nothing's selected / it's
  // no longer in the list. Shared by canShiftUp/canShiftDown and sendShiftedPlaylistAsync's callers.
  getSelectedTrackIndex(): number {
    return this.playlist?.findIndex(track => track.path === this.selectedTrack?.path) ?? -1;
  }

  private getPlayingTrackIndex(): number {
    return this.playlist?.findIndex(track => track.isPlaying) ?? -1;
  }

  // Moving a track up swaps it into (selectedIndex - 1). Disallow that landing at or before the playing
  // track's position - which covers both the playing track itself (selectedIndex === playingIndex - can't
  // reorder what's already playing) and the slot directly after it (would swap the playing track out of its
  // spot instead of just reordering the upcoming tracks around it).
  canShiftUp(): boolean {
    if (this.isActionInProgress || !this.selectedTrack) return false;
    const selectedIndex = this.getSelectedTrackIndex();
    if (selectedIndex === -1) return false;
    return selectedIndex - 1 > this.getPlayingTrackIndex();
  }

  canShiftDown(): boolean {
    if (this.isActionInProgress || !this.selectedTrack) return false;
    const selectedIndex = this.getSelectedTrackIndex();
    if (selectedIndex === -1) return false;
    return selectedIndex + 1 < (this.playlist?.length ?? 0);
  }

  async onDeleteTrackAsync(): Promise<void> {
    this.isActionInProgress = true;

    if (this.selectedTrack) {
      await this.playerService.removePlaylistTrackAsync([this.selectedTrack.path]);
      // Without this, selectedTrack keeps pointing at a track that's no longer in the list - the next
      // ngOnChanges tries to find its (now-gone) radio input via document.getElementById and throws trying to
      // set .checked on null.
      this.selectedTrack = undefined;
    }

    this.isActionInProgress = false;
  }

  async onShiftUpClickedAsync(): Promise<void> {
    this.isActionInProgress = true;
    const currentIndex = this.getSelectedTrackIndex();
    const newIndex = currentIndex - 1;
    await this.sendShiftedPlaylistAsync(newIndex, currentIndex);
    this.isActionInProgress = false;
  }

  async onShiftDownClickedAsync(): Promise<void> {
    this.isActionInProgress = true;
    const currentIndex = this.getSelectedTrackIndex();
    const newIndex = currentIndex + 1;
    await this.sendShiftedPlaylistAsync(newIndex, currentIndex);
    this.isActionInProgress = false;
  }

  async sendShiftedPlaylistAsync(newIndex: number, currentIndex?: number,): Promise<void> {
    const shiftedPlaylist = [...this.playlist?.map(track => track.path) ?? []];

    // `!currentIndex` was wrong two ways: findIndex returns -1 (a truthy number) when nothing is selected, so
    // that genuinely-invalid case slipped through this check - then shiftedPlaylist[-1]/[newIndex] below would
    // silently corrupt the array (writes an "-1" property and overwrites index 0 with undefined) and send that
    // to the backend. And currentIndex === 0 (a valid selection - the first track) is falsy, so `!currentIndex`
    // incorrectly blocked shifting the first track down. Explicit checks fix both.
    if (currentIndex === undefined || currentIndex === -1 || newIndex < 0 || newIndex >= shiftedPlaylist.length) return;

    [shiftedPlaylist[currentIndex], shiftedPlaylist[newIndex]] = [shiftedPlaylist[newIndex], shiftedPlaylist[currentIndex]];
    await this.playerService.reorderNowPlayingPlaylistAsync(shiftedPlaylist);

    // The backend broadcasts its own confirming update right after processing the reorder, but a
    // PlaybackBroadcast tick that was already in flight beforehand could still arrive in between and briefly
    // show the pre-reorder order again. Holding the lock for a couple seconds rides that out.
    this.isReorderPending = true;
    this.updatePlayerPlaylist.emit(this.isReorderPending);

    setTimeout(() => {
      this.isReorderPending = false;
      this.updatePlayerPlaylist.emit(this.isReorderPending);
    }, 2000);
  }
}
