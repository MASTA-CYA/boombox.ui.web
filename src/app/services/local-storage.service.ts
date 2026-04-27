import { Injectable } from '@angular/core';
import { getErrorMessage } from '../common/functions';
import { SnackbarService } from './snackbar.service';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor(private snackbarService: SnackbarService) { }

  public add(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public get(key: string): any {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  public remove(key: string): void {
    localStorage.removeItem(key);
  }

  public clear(): void {
    localStorage.clear();
  }
}
