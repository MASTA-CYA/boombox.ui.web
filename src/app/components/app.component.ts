import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { debounceTime, Subject, Subscription } from 'rxjs';
import { MainComponent } from './main/main.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { SnackbarComponent } from "./snackbar/snackbar.component";
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AutoScrollService } from '../services/auto-scroll.service';
import { SnackbarService } from '../services/snackbar.service';
import { getErrorMessage } from '../common/functions';
import { LibraryService } from '../services/library.service';
import { SvgIconComponent } from '@ngneat/svg-icon';
import { NavigationEnd, Router } from '@angular/router';
import { ScrollPosition } from './library/models/scroll-position';


@Component({
  selector: 'app-root',
  imports: [SidebarComponent, MainComponent, SnackbarComponent, ScrollingModule, SvgIconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private scrollSubscription!: Subscription;
  private activeRoute: string | undefined;
  scrollPositionUpdate = new Subject<ScrollPosition>();
  showScrollButton: boolean = false;

  title = 'Boombox';

  constructor(
    private scrollService: AutoScrollService,
    private snackbarService: SnackbarService,
    private libraryService: LibraryService,
    private router: Router
  ) {
    this.scrollPositionUpdate.pipe(debounceTime(800))
    .subscribe(async (position: ScrollPosition) => {
      await this.libraryService.updateLibraryScrollPositionAsync(position.horizontal, position.vertical);
    });
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

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.activeRoute = event.urlAfterRedirects;
        this.showScrollButton = this.activeRoute === "/library" && this.scrollContainer.nativeElement.scrollTop > 2000;
      }
    });
  }

  ngOnDestroy() {
    if (this.scrollSubscription)
      this.scrollSubscription.unsubscribe();
  }

  async onScroll(event: Event): Promise<void> {
    if (this.activeRoute === "/library") {
      const element = event.target as HTMLElement;
      this.showScrollButton = this.activeRoute === "/library" && element.scrollTop > 2000;
      this.scrollPositionUpdate.next(new ScrollPosition(element.scrollLeft, element.scrollTop));
    }
  }

  onScrollToTop() {
    this.scrollContainer.nativeElement.scrollTop = 0;
  }
}
