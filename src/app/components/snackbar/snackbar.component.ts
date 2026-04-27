import { Component, OnDestroy, AfterViewInit } from '@angular/core';
import { SnackbarMessage } from './models/snackbar-message';
import { timer } from 'rxjs';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  imports: [],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.css'
})
export class SnackbarComponent implements AfterViewInit, OnDestroy {
  private timeoutId: any;
  isVisible: boolean;
  snackbar: SnackbarMessage | undefined;

  constructor(private snackbarService: SnackbarService) {
    this.isVisible = false;
    this.clearSnackbarMessage();
  }

  ngAfterViewInit(): void {
    this.snackbarService.currentMessage$.subscribe(async (message) => await this.showSnackbar(message));
  }

  async showSnackbar(snackbarMessage: SnackbarMessage | null): Promise<void> {
    if (!snackbarMessage) return;

    this.snackbar = snackbarMessage;
    this.isVisible = true;

    const durationInMilliseconds = 10000;
    timer(durationInMilliseconds).subscribe(() => {
      this.isVisible = false;
      this.clearSnackbarMessage();
    });
  }

  clearSnackbarMessage(): void { this.snackbar = new SnackbarMessage('', ''); }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
