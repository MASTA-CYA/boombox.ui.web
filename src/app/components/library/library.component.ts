import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone, signal, Signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { LibraryService } from '../../services/library.service';
import { filter, map, Subscription } from 'rxjs';
import { Album } from './models/album';
import { DomSanitizer } from '@angular/platform-browser';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { IMappingUpdate } from './interfaces/update';
import { MappingUpdate } from './models/update';
import { SearchBarComponent } from "../search-bar/search-bar.component";
import { OrderByOption } from '../search-bar/models/orderby-option-enum';
import { IAlbum } from './interfaces/album';
import { Track } from './models/track';
import { AutoScrollService } from '../../services/auto-scroll.service';
import { getDisplayBytes, getDurationFromSeconds, getMappingRunTypeLabel } from '../../common/functions';

@Component({
  selector: 'app-library',
  imports: [MatCardModule, SvgIconComponent, RouterOutlet, ProgressBarComponent, SearchBarComponent, DecimalPipe, ScrollingModule],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent implements OnInit, AfterViewInit, OnDestroy {
  // { read: ElementRef } is required here - #scrollableContainer sits on <cdk-virtual-scroll-viewport>, which
  // is a component, and ViewChild's default resolution for a template-ref var on a component tag is the
  // component instance, not its ElementRef. Without this, scrollContainer.nativeElement is always undefined,
  // clientWidth always reads as 0, and columnsPerRow silently stays stuck at its initial default forever.
  @ViewChild('scrollableContainer', { read: ElementRef }) private scrollContainer!: ElementRef;

  // .library-item is a fixed 200px wide with a 12px column-gap between cards (library.component.css) - used to
  // work out how many cards fit per row so displayAlbums can be chunked into rows for cdk-virtual-scroll-viewport.
  // The grid can't be virtualized card-by-card since cdkVirtualFor expects a single-direction list, not a
  // wrapping grid - so each row is one virtualized "item" containing a normal (non-virtualized) flex row of
  // cards. ROW_HEIGHT must match .library-row's actual rendered height (320px card + 30px gap) exactly, or
  // rows will overlap/gap incorrectly since that's what tells CDK how far apart to position each row.
  private static readonly CARD_WIDTH = 200;
  private static readonly CARD_GAP = 12;
  protected readonly rowHeight = 350;

  // CDK's own defaults (100px min / 200px max) are less than one row's height, so during fast scrolling a row
  // (and its images) barely mounts before it's already on screen - nothing lazy-loads it further in advance
  // than CDK's buffer already dictates, so a wider buffer is what actually gives images lead time to fetch and
  // decode before they're visible. ~4 rows of buffer trades some extra off-screen DOM/image nodes for that.
  protected readonly rowBufferPx = this.rowHeight * 2;

  public albums: Album[] | undefined;
  public displayAlbums: Album[] | undefined;
  public albumRows: Album[][] = [];
  private columnsPerRow = 1;
  private resizeObserver: ResizeObserver | undefined;
  public mappingUpdate: IMappingUpdate;
  public totalNumberOfAlbums: number = 0;
  public totalNumberOfTracks: number = 0;
  public totalNumberOfFavorites: number = 0;
  public elapsedDisplay: string = '00:00';
  protected readonly getDisplayBytes = getDisplayBytes;
  protected readonly getMappingRunTypeLabel = getMappingRunTypeLabel;
  private cachedAlbum: IAlbum[] | undefined;

  private albumSubscription!: Subscription;
  private mappingUpdateSubscription!: Subscription;
  private localCacheClearedSubscription!: Subscription;
  private elapsedTimerHandle: ReturnType<typeof setInterval> | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private libraryService: LibraryService,
    private scrollService: AutoScrollService,
    private domSanitizer: DomSanitizer
  ) {
    this.mappingUpdate = new MappingUpdate(0, '', '', false);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (event.url === "/library")
        setTimeout(async () => await this.scrollService.getLibraryScrollPositionAsync(), 0);
    });
  }

  async ngOnInit(): Promise<void> {
    this.localCacheClearedSubscription = this.libraryService.localCacheCleared$.subscribe(_ => window.location.reload());
    this.mappingUpdateSubscription = this.libraryService.mappingUpdate$.subscribe(async (update) => {
      this.mappingUpdate = new MappingUpdate(
        update.percent,
        update.message,
        update.error,
        update.isComplete,
        update.directoryCount,
        update.mappedDirectories,
        update.startedAtUtc,
        update.cpuPercent,
        update.memoryMb,
        update.bytesBroadcast,
        update.runType,
      );

      if (this.mappingUpdate.isComplete) {
        this.stopElapsedTimer();
        await this.scrollService.getLibraryScrollPositionAsync();
      } else {
        this.startElapsedTimer();
      }
    });
    this.albumSubscription = this.libraryService.albums$.subscribe(async (albums) => {
      this.cachedAlbum = albums;
      this.albums = albums.map((album) => new Album(this.domSanitizer, album))
      this.setDisplayAlbums(this.getFilteredAlbums("", OrderByOption.new));
      await this.scrollService.getLibraryScrollPositionAsync();
      // #scrollableContainer only exists once displayAlbums is truthy (it's behind an @else block, hidden
      // behind the progress bar until now) - ngAfterViewInit runs before this data ever arrives, so this is
      // the first point where the viewport element is actually guaranteed to be in the DOM to measure/observe.
      setTimeout(() => {
        this.populateLibraryStats();
        this.trySetupResizeObserver();
      }, 0);
    });
    await this.libraryService.getLibraryAsync();
    this.libraryService.filterLibraryUpdate$.subscribe((model) => {
      this.setDisplayAlbums(this.getFilteredAlbums(model.searchText, model.orderByOption));
    });
  }

  ngAfterViewInit(): void {
    // Usually a no-op here: at this point displayAlbums is still undefined (the library data hasn't loaded
    // yet), so #scrollableContainer isn't rendered and trySetupResizeObserver bails out immediately. Kept as a
    // safety net in case albums$ ever emits before this runs.
    this.trySetupResizeObserver();
  }

  // Guarded so it's safe to call from multiple points (ngAfterViewInit, and again once the album grid has
  // actually rendered) without creating more than one ResizeObserver.
  private trySetupResizeObserver(): void {
    if (this.resizeObserver || !this.scrollContainer?.nativeElement) return;

    this.recalculateColumnsPerRow();

    // The grid's column count depends on available width, which changes with window resize (and, since this
    // is a sidebar layout, with the sidebar's own width). Re-chunking into rows only when the column count
    // actually changes (not on every resize tick) avoids pointless rebuilds during a drag-resize.
    this.resizeObserver = new ResizeObserver(() => this.recalculateColumnsPerRow());
    this.resizeObserver.observe(this.scrollContainer.nativeElement);
  }

  ngOnDestroy() {
    if (this.albumSubscription)
      this.albumSubscription.unsubscribe();

    if (this.mappingUpdateSubscription)
      this.mappingUpdateSubscription.unsubscribe();

    if (this.resizeObserver)
      this.resizeObserver.disconnect();

    if (this.localCacheClearedSubscription)
      this.localCacheClearedSubscription.unsubscribe();

    this.stopElapsedTimer();
  }

  // startedAtUtc is a fixed point in time, but mapping updates arrive per-file (bursty, uneven spacing) - a
  // ticking client-side timer gives a smooth "elapsed" readout instead of one that only updates whenever the
  // next file happens to finish mapping.
  private startElapsedTimer(): void {
    if (this.elapsedTimerHandle || !this.mappingUpdate.startedAtUtc) return;

    this.updateElapsedDisplay();
    this.elapsedTimerHandle = setInterval(() => this.updateElapsedDisplay(), 1000);
  }

  private stopElapsedTimer(): void {
    if (!this.elapsedTimerHandle) return;

    clearInterval(this.elapsedTimerHandle);
    this.elapsedTimerHandle = undefined;
  }

  private updateElapsedDisplay(): void {
    if (!this.mappingUpdate.startedAtUtc) return;

    const elapsedSeconds = (Date.now() - new Date(this.mappingUpdate.startedAtUtc).getTime()) / 1000;
    this.elapsedDisplay = getDurationFromSeconds(Math.max(0, elapsedSeconds));
  }

  async onAlbumClick(selectedAlbum: Album): Promise<void> {
    await this.libraryService.setSelectedAlbumAsync(selectedAlbum, this.cachedAlbum?.find(album => album.name == selectedAlbum.name)!);
    this.router.navigate(['album'], { relativeTo: this.route });
  }

  getFilteredAlbums(text: string, option?: OrderByOption): Album[] {
    const filteredAlbums = this.albums?.filter((album) => (album.name?.toLowerCase() ?? "").includes(text.toLowerCase())
      || album.artist.toLowerCase().includes(text.toLowerCase())) ?? [];

    switch (option) {
      case OrderByOption.favorite:
        return filteredAlbums.sort((a, b) => b.tracks.filter(track => track.isFavourite).length - a.tracks.filter(track => track.isFavourite).length);
      case OrderByOption.plays:
        return filteredAlbums.sort((a, b) => this.getAlbumTrackTimesPlayed(b.tracks) - this.getAlbumTrackTimesPlayed(a.tracks));
      case OrderByOption.new:
      default:
        return filteredAlbums.sort((a, b) => new Date(b.dateMapped)?.getTime() - new Date(a.dateMapped)?.getTime());
    }
  }

  private getAlbumTrackTimesPlayed(array: Track[]): number {
    return array.map(track => track.timesPlayed).reduce((accumulator, current) => accumulator + current);
  }

  public async onClearLocalCacheClicked(): Promise<void> {
    await this.libraryService.clearLocalCacheAsync();
    this.setDisplayAlbums(undefined);
  }

  public trackByRowIndex(index: number): number {
    return index;
  }

  // Single choke point for updating displayAlbums so it can never drift out of sync with albumRows - every
  // caller that used to assign displayAlbums directly now goes through here instead.
  private setDisplayAlbums(albums: Album[] | undefined): void {
    this.displayAlbums = albums;
    this.chunkAlbumsIntoRows();
  }

  private chunkAlbumsIntoRows(): void {
    const albums = this.displayAlbums ?? [];
    const rows: Album[][] = [];

    for (let i = 0; i < albums.length; i += this.columnsPerRow)
      rows.push(albums.slice(i, i + this.columnsPerRow));

    this.albumRows = rows;
  }

  private recalculateColumnsPerRow(): void {
    const containerWidth = this.scrollContainer?.nativeElement?.clientWidth ?? 0;
    if (!containerWidth) return;

    const newColumnsPerRow = Math.max(1, Math.floor(
      (containerWidth + LibraryComponent.CARD_GAP) / (LibraryComponent.CARD_WIDTH + LibraryComponent.CARD_GAP)
    ));

    if (newColumnsPerRow === this.columnsPerRow) return;

    this.columnsPerRow = newColumnsPerRow;
    this.chunkAlbumsIntoRows();
  }

  private populateLibraryStats(): void {
    this.totalNumberOfAlbums = this.albums?.length ?? 0;
    this.totalNumberOfTracks = this.albums?.map(album => album.numberOfTracks).reduce((accumulator, current) => accumulator + current, 0) ?? 0;
    this.totalNumberOfFavorites = this.albums?.map(album => album.tracks.filter(track => track.isFavourite)).reduce((accumulator, current) => accumulator + current.length, 0) ?? 0;
  }
}
