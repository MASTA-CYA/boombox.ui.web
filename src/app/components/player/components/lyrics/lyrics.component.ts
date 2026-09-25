import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../../../services/player.service';
import { ILyrics, ILyricsLine } from './models/lyrics';

@Component({
  selector: 'app-lyrics',
  imports: [FormsModule, SvgIconComponent],
  templateUrl: './lyrics.component.html',
  styleUrl: './lyrics.component.css'
})
export class LyricsComponent implements OnInit, OnDestroy {
  // Both set synchronously by TrackInformationComponent right after projectComponent(), same pattern
  // EqualizerComponent's inputs use - read in ngOnInit below. trackName is display-only (shown as the dialog's
  // first line, since the modal's own title is the fixed "Lyrics" label, not the track).
  @Input() trackPath: string = '';
  @Input() trackName: string = '';

  // Lets TrackInformationComponent know whether to show a "Save" button in the modal's own footer - that
  // button only makes sense once we know the automated sources came up empty, which isn't known at the moment
  // the dialog is first opened (see onOpenLyricsClicked's dynamic ModalConfig). Fires again after a manual save
  // succeeds too, so the footer button can remove itself once it's no longer needed.
  @Output() lyricsFound = new EventEmitter<boolean>();

  @ViewChildren('lineEl') lineElements!: QueryList<ElementRef<HTMLElement>>;

  isLoading: boolean = true;
  lines: ILyricsLine[] = [];
  isSynced: boolean = false;
  activeLineIndex: number = -1;

  // Manual paste-in fallback, shown only once loading has finished and nothing was found from any automated
  // source (embedded tag, LRCLIB, .lrc sidecar).
  manualLyricsText: string = '';
  isSaving: boolean = false;

  private seekbarSubscription: Subscription | undefined;

  constructor(private playerService: PlayerService) { }

  async ngOnInit(): Promise<void> {
    await this.loadLyricsAsync();

    // seekbarPlayingTrack$ ticks every ~500ms while something is playing (see PlayerComponent/PlaybackBroadcast)
    // - reused directly rather than adding a second polling source, since it already carries exactly what's
    // needed (playedDuration for the currently playing track). Guarded to the track this dialog was opened
    // for, so nothing happens if playback somehow moves to a different track while the dialog is still open.
    this.seekbarSubscription = this.playerService.seekbarPlayingTrack$.subscribe(track => {
      if (!this.isSynced || !track || track.path !== this.trackPath) return;
      this.updateActiveLine(track.playedDuration);
    });
  }

  ngOnDestroy(): void {
    this.seekbarSubscription?.unsubscribe();
  }

  get hasNoLyrics(): boolean {
    return !this.isLoading && this.lines.length === 0;
  }

  async onSaveManualLyricsClicked(): Promise<void> {
    if (!this.manualLyricsText.trim() || this.isSaving) return;

    this.isSaving = true;

    try {
      const lyrics = await this.playerService.saveManualLyricsAsync(this.trackPath, this.manualLyricsText);
      this.applyLyrics(lyrics);
    } finally {
      this.isSaving = false;
    }
  }

  private async loadLyricsAsync(): Promise<void> {
    this.isLoading = true;
    const lyrics = await this.playerService.getTrackLyricsAsync(this.trackPath);
    this.applyLyrics(lyrics);
    this.isLoading = false;
  }

  private applyLyrics(lyrics: ILyrics | undefined): void {
    this.lines = lyrics?.lines ?? [];
    this.isSynced = this.lines.length > 0 && this.lines.some(line => line.timestampMs !== null);
    this.activeLineIndex = -1;
    this.lyricsFound.emit(this.lines.length > 0);
  }

  // Highlights the last line whose timestamp hasn't been reached yet - lines are already time-ordered by
  // LrcParser, so a simple forward scan is enough (playback position only ever moves forward except on a
  // manual seek/rewind, which this still handles correctly since it re-scans from the start every tick rather
  // than only ever advancing).
  private updateActiveLine(playedDurationSeconds: number): void {
    const positionMs = playedDurationSeconds * 1000;
    let newIndex = -1;

    for (let i = 0; i < this.lines.length; i++) {
      const timestamp = this.lines[i].timestampMs;
      if (timestamp === null || timestamp > positionMs) break;
      newIndex = i;
    }

    if (newIndex === this.activeLineIndex) return;

    this.activeLineIndex = newIndex;
    this.scrollActiveLineIntoView();
  }

  private scrollActiveLineIntoView(): void {
    // Deferred a tick so the DOM has the newly-applied active-line class (and therefore correct scrollHeight)
    // before scrollIntoView measures anything.
    setTimeout(() => {
      const activeElement = this.lineElements?.toArray()[this.activeLineIndex]?.nativeElement;
      activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
