import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-album-search-bar',
  imports: [SvgIconComponent],
  templateUrl: './album-search-bar.component.html',
  styleUrl: './album-search-bar.component.css'
})
export class AlbumSearchBarComponent {
  @ViewChild('trackSearch') private searchBar!: ElementRef;
  @Output() searchTextOutput = new EventEmitter<string>();

  canClearSearch: boolean | undefined;
  searchInput = new Subject<string>();


  constructor() {
    this.searchInput
      .pipe(debounceTime(200))
      .subscribe((text: string) => {
        this.searchTextOutput.emit(text);
      });
  }

  onSearchClicked(searchText: string): void {
    if (searchText || searchText == '')
      this.searchInput.next(searchText);
  }

  onClearClicked(): void {
    this.searchBar.nativeElement.value = '';
    this.canClearSearch = false;
    this.onSearchClicked('');
  }

  onSearchTextChanged(event: any): void {
    const text = event.target.value;
    this.canClearSearch = text && text != '';
    this.onSearchClicked(text);
  }
}
