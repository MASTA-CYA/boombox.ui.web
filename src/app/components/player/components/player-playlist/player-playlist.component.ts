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

  @Output() updatePlayerPlaylist = new EventEmitter<boolean>();
  updatedPlaylistRequested: boolean = true;

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

    setTimeout(() => {
      const selectedTrackButton = document.getElementById(`player_playlist_${this.selectedTrack!.path}`) as HTMLInputElement;
      selectedTrackButton.checked = true;
      this.cdRef.markForCheck();
    }, 0)
  }

  onPlaylistTrackSelected(path: string): void {
    this.selectedTrack = this.playlist?.find(track => track.path === path);
  }

  async onDeleteTrackAsync(): Promise<void> {
    this.toggleActionButtons(true);

    if (this.selectedTrack)
      await this.playerService.removePlaylistTrackAsync([this.selectedTrack?.path]);

    this.toggleActionButtons(false);
  }

  async onShiftUpClickedAsync(): Promise<void> {
    this.toggleActionButtons(true);
    const currentIndex = this.playlist?.findIndex(track => track.path == this.selectedTrack?.path);
    const newIndex = (currentIndex ?? 0) - 1;
    await this.sendShiftedPlaylistAsync(newIndex, currentIndex);
    this.toggleActionButtons(false);
  }

  async onShiftDownClickedAsync(): Promise<void> {
    this.toggleActionButtons(true);
    const currentIndex = this.playlist?.findIndex(track => track.path == this.selectedTrack?.path);
    const newIndex = (currentIndex ?? 0) + 1;
    await this.sendShiftedPlaylistAsync(newIndex, currentIndex);
    this.toggleActionButtons(false);
  }

  async sendShiftedPlaylistAsync(newIndex: number, currentIndex?: number,): Promise<void> {
    const shiftedPlaylist = [...this.playlist?.map(track => track.path) ?? []];

    if (newIndex < 0 || newIndex >= shiftedPlaylist.length || !currentIndex) return;

    [shiftedPlaylist[currentIndex], shiftedPlaylist[newIndex]] = [shiftedPlaylist[newIndex], shiftedPlaylist[currentIndex]];
    await this.playerService.reorderNowPlayingPlaylistAsync(shiftedPlaylist);

    this.updatePlayerPlaylist.emit(true);
    // setTimeout(() => {
    //   this.updatedPlaylistRequested = false;
    //   this.updatePlayerPlaylist.emit(this.updatedPlaylistRequested);
    // }, 2000);
  }

  private toggleActionButtons(disabled: boolean): void {
    setTimeout(() => {
      const shiftUpButton = document.getElementById("shift-up") as HTMLInputElement;
      shiftUpButton.disabled = disabled;
      const shiftDownButton = document.getElementById("shift-down") as HTMLInputElement;
      shiftDownButton.disabled = disabled;
      const deleteButton = document.getElementById("delete-track") as HTMLInputElement;
      deleteButton.disabled = disabled;
    }, 0);
  }
}
