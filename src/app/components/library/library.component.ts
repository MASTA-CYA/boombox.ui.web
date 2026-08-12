import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, NgZone, signal, Signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
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
import { getDurationFromSeconds } from '../../common/functions';

@Component({
  selector: 'app-library',
  imports: [MatCardModule, SvgIconComponent, RouterOutlet, ProgressBarComponent, SearchBarComponent, DecimalPipe],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent implements OnInit {
  @ViewChild('scrollableContainer') private scrollContainer!: ElementRef;

  public albums: Album[] | undefined;
  public displayAlbums: Album[] | undefined;
  public mappingUpdate: IMappingUpdate;
  public totalNumberOfAlbums: number = 0;
  public totalNumberOfTracks: number = 0;
  public totalNumberOfFavorites: number = 0;
  public elapsedDisplay: string = '00:00';
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
      this.displayAlbums = this.getFilteredAlbums("", OrderByOption.new);;
      await this.scrollService.getLibraryScrollPositionAsync();
      setTimeout(() => this.populateLibraryStats(), 0);
    });
    await this.libraryService.getLibraryAsync();
    this.libraryService.filterLibraryUpdate$.subscribe((model) => {
      this.displayAlbums = this.getFilteredAlbums(model.searchText, model.orderByOption);
    });
  }

  ngOnDestroy() {
    if (this.albumSubscription)
      this.albumSubscription.unsubscribe();

    if (this.mappingUpdateSubscription)
      this.mappingUpdateSubscription.unsubscribe();

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
    this.displayAlbums = undefined;
  }

  private populateLibraryStats(): void {
    this.totalNumberOfAlbums = this.albums?.length ?? 0;
    this.totalNumberOfTracks = this.albums?.map(album => album.numberOfTracks).reduce((accumulator, current) => accumulator + current, 0) ?? 0;
    this.totalNumberOfFavorites = this.albums?.map(album => album.tracks.filter(track => track.isFavourite)).reduce((accumulator, current) => accumulator + current.length, 0) ?? 0;
  }
}
