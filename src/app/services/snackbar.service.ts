import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SnackbarMessage } from '../components/snackbar/models/snackbar-message';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private messageSource: BehaviorSubject<SnackbarMessage | null> = new BehaviorSubject<SnackbarMessage | null>(null);
  public currentMessage$: Observable<SnackbarMessage | null> = this.messageSource.asObservable();

  showMessage(message: String, title?: String) {
    if (message && message != '')
      this.messageSource.next(new SnackbarMessage(title ?? 'Error', message));
  }
}