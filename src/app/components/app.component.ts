import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, ViewContainerRef, inject, HostListener, NgZone } from '@angular/core';
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
import { ModalComponent } from "./modal/modal.component";
import { ModalService } from '../services/modal.service';
import { PlayerService } from '../services/player.service';
import { IPlayerState } from './player/interfaces/player-state';
import { PlayerState } from './player/models/player-state';


@Component({
  selector: 'app-root',
  imports: [SidebarComponent, MainComponent, SnackbarComponent, ScrollingModule, SvgIconComponent, ModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('modalContent', { read: ViewContainerRef }) private modalContent!: ViewContainerRef;

  private scrollSubscription!: Subscription;
  scrollPositionUpdate = new Subject<ScrollPosition>();

  public playerState: PlayerState | undefined;
  private playerActionsSubscription!: Subscription;

  private activeRoute: string | undefined;
  showScrollButton: boolean = false;

  title = 'Boombox';

  constructor(
    private scrollService: AutoScrollService,
    private snackbarService: SnackbarService,
    private libraryService: LibraryService,
    private playerService: PlayerService,
    private router: Router,
    private modalService: ModalService,
    private ngZone: NgZone,
  ) {
    this.scrollPositionUpdate.pipe(debounceTime(800))
      .subscribe(async (position: ScrollPosition) => {
        await this.scrollService.updateLibraryScrollPositionAsync(position.horizontal, position.vertical);
      });
    this.playerActionsSubscription = this.playerService.playerState$.subscribe((state) =>
      this.ngZone.runOutsideAngular(() => this.handlePlayerStateUpdates(state)));
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

    if (!this.modalContent) return;
    this.modalService.registerHost(this.modalContent); // no work
  }

  ngOnDestroy() {
    if (this.scrollSubscription)
      this.scrollSubscription.unsubscribe();

    if (this.playerActionsSubscription)
      this.playerActionsSubscription.unsubscribe();
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

  private handlePlayerStateUpdates(state: IPlayerState): void {
    const hasNextChanged = this.playerState?.hasNext != state.hasNext;
    const isPlayingChanged = this.playerState?.isPlaying != state.isPlaying;
    const hasPreviousChanged = this.playerState?.hasPrevious != state.hasPrevious;
    const hasModeChanged = this.playerState?.mode != state.mode;

    if (hasNextChanged || isPlayingChanged || hasPreviousChanged || hasModeChanged) {
      setTimeout(() => {
        this.playerState = new PlayerState(state);
      }, 0);
    }
  }

  @HostListener('window:keydown.shift.p', ['$event'])
  async handlePlayPrevious(event: KeyboardEvent): Promise<void> {
    event.preventDefault();
    
    if (this.playerState?.hasPrevious)
      await this.playerService.playPreviousAsync();
  }

  @HostListener('window:keydown.shift.n', ['$event'])
  async handlePlayNext(event: KeyboardEvent): Promise<void> {
    event.preventDefault();

    if (this.playerState?.hasNext)
      await this.playerService.playNextAsync();
  }

  @HostListener('window:keydown.space', ['$event'])
  async handlePause(event: KeyboardEvent): Promise<void> {
    event.preventDefault();

    if (this.playerState?.isPlaying)
      await this.playerService.pauseAsync();
    else
      await this.playerService.playAsync();
  }
}
