import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MainComponent } from './main/main.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SnackbarComponent } from "./snackbar/snackbar.component";
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AutoScrollService } from '../services/auto-scroll.service';
import { SnackbarService } from '../services/snackbar.service';
import { getErrorMessage } from '../common/functions';
import { LibraryService } from '../services/library.service';


@Component({
  selector: 'app-root',
  imports: [SidebarComponent, MainComponent, SnackbarComponent, ScrollingModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private scrollSubscription!: Subscription;

  title = 'Boombox';

  constructor(
    private scrollService: AutoScrollService,
    private snackbarService: SnackbarService,
    private libraryService: LibraryService) { }

  async ngOnInit(): Promise<void> {

  }

  ngAfterViewInit(): void {
    this.scrollSubscription = this.scrollService.scrollPosition$.subscribe((position) => {
      try {
        const currentHorizontalPosition = this.scrollContainer.nativeElement.scrollLeft;
        const currentVerticalPosition = this.scrollContainer.nativeElement.scrollTop;

        if (position.horizontal != 0 && currentHorizontalPosition != position.horizontal)
          this.scrollContainer.nativeElement.scrollLeft = position.horizontal;

        if (position.vertical != 0 && currentVerticalPosition != position.vertical)
          this.scrollContainer.nativeElement.scrollTop = position.vertical;
      } catch (err) {
        this.snackbarService.showMessage(getErrorMessage(err));
        console.error(err);
      }
    });
  }

  async onScroll(event: Event): Promise<void> {
    const element = event.target as HTMLElement;
    await this.libraryService.updateLibraryScrollPositionAsync(element.scrollLeft, element.scrollTop);
  }

  ngOnDestroy() {
    if (this.scrollSubscription)
      this.scrollSubscription.unsubscribe();
  }
}
