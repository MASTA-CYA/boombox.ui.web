import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { LibraryService } from '../../services/library.service';
import { OrderByOption } from './models/orderby-option-enum';
import { debounceTime, Subject } from 'rxjs';
import { SearchModel } from './models/search-model';

@Component({
  selector: 'app-search-bar',
  imports: [SvgIconComponent],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  @ViewChild('search') private searchBar!: ElementRef;
  canClearSearch: boolean | undefined;
  orderByOptions: [string, OrderByOption][] = Object.entries(OrderByOption);
  searchInput = new Subject<SearchModel>();

  constructor(private libraryService: LibraryService) {
    this.searchInput
      .pipe(debounceTime(500))
      .subscribe((model: SearchModel) => {
        this.libraryService.filterLibrary(model);
      });
  }

  onSearchClicked(searchText: string, option?: OrderByOption): void {
    if (searchText || searchText == '')
      this.searchInput.next(new SearchModel(searchText, option))
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

  onOrderByChanged(text: string, option: string) {
    const selectedEnum = this.orderByOptions.find((map) => map[0] == option)?.[1];
    this.onSearchClicked(text, selectedEnum);
  }
}
