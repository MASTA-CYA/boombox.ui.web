import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, NgZone, signal, Signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { Router, ActivatedRoute, Scroll } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { LibraryService } from '../../services/library.service';
import { map, Subscription } from 'rxjs';
import { Album } from './models/album';
import { DomSanitizer } from '@angular/platform-browser';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { IMappingUpdate } from './interfaces/update';
import { MappingUpdate } from './models/update';
import { SnackbarService } from '../../services/snackbar.service';
import { AutoScrollService } from '../../services/auto-scroll.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { SearchBarComponent } from "../search-bar/search-bar.component";
import { OrderByOption } from '../search-bar/models/orderby-option-enum';
import { IAlbum } from './interfaces/album';
import { Track } from './models/track';

@Component({
  selector: 'app-library',
  imports: [MatCardModule, SvgIconComponent, RouterOutlet, ProgressBarComponent, SearchBarComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollableContainer') private scrollContainer!: ElementRef;

  public albums: Album[] | undefined;
  public displayAlbums: Album[] | undefined;
  public mappingUpdate: IMappingUpdate;
  private albumSubscription!: Subscription;
  private mappingUpdateSubscription!: Subscription;
  private cachedAlbum: IAlbum[] | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private libraryService: LibraryService,
    private domSanitizer: DomSanitizer,) {
    this.mappingUpdate = new MappingUpdate(0, '', '', false);
  }

  async ngAfterViewInit(): Promise<void> {
    await this.libraryService.getLibraryAsync();
  }

  async ngOnInit(): Promise<void> {
    this.mappingUpdateSubscription = this.libraryService.mappingUpdate$.subscribe(async (update) => {
      this.mappingUpdate = new MappingUpdate(update.percent, update.message, update.error, update.isComplete);

      if (this.mappingUpdate.isComplete)
        await this.libraryService.getLibraryScrollPositionAsync();
    });
    this.albumSubscription = this.libraryService.albums$.subscribe((albums) => {
      this.cachedAlbum = albums;
      this.albums = albums.map((album) => new Album(this.domSanitizer, album))
      this.displayAlbums = this.albums;
    });
    await this.libraryService.getLibraryAsync();
    this.libraryService.filterLibraryUpdate$.subscribe((model) => {
      this.displayAlbums = this.getFilteredAlbums(model.searchText, model.orderByOption);
    });
  }

  async onAlbumClick(selectedAlbum: Album): Promise<void> {
    await this.libraryService.setSelectedAlbumAsync(selectedAlbum, this.cachedAlbum?.find(album => album.name == selectedAlbum.name)!);
    this.router.navigate(['album'], { relativeTo: this.route });
  }

  getFilteredAlbums(text: string, option?: OrderByOption): Album[] {
    const filteredAlbums = this.albums?.filter((album) => album.name.includes(text) || album.artist.includes(text)) ?? [];

    switch (option) {
      case OrderByOption.favorite:
        return filteredAlbums.sort((a, b) => b.tracks.filter(track => track.isFavourite).length - a.tracks.filter(track => track.isFavourite).length);
      case OrderByOption.plays:
        return filteredAlbums.sort((a, b) => this.getAlbumTrackTimesPlayed(b.tracks) - this.getAlbumTrackTimesPlayed(a.tracks));
      case OrderByOption.new:
        return filteredAlbums.sort((a, b) => b.dateMapped.getTime() - a.dateMapped.getTime());
      default:
        return filteredAlbums;
    }
  }

  private getAlbumTrackTimesPlayed(array: Track[]): number {
    return array.map(track => track.timesPlayed).reduce((accumulator, current) => accumulator + current);
  }

  ngOnDestroy() {
    if (this.albumSubscription)
      this.albumSubscription.unsubscribe();

    if (this.mappingUpdateSubscription)
      this.mappingUpdateSubscription.unsubscribe();
  }
}
