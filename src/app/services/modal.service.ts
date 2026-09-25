import { ComponentRef, Injectable, Type, ViewContainerRef } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ModalConfig, ModalButtonConfig, ModalButtonType } from '../components/modal/models/modal';
import { ConfirmDialogComponent } from '../components/modal/confirm-dialog/confirm-dialog.component';

export interface ConfirmOptions {
  confirmText?: string;
  confirmColor?: string;
  confirmIcon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private hostContainer!: ViewContainerRef;
  public projectedComponent: ComponentRef<any> | undefined;

  private openDialogSubject: Subject<ModalConfig> = new Subject<ModalConfig>();
  public openDialog$: Observable<ModalConfig> = this.openDialogSubject.asObservable();

  // Lets a caller (e.g. confirm() below) force the dialog closed programmatically - ModalComponent has no
  // other API for this, since normally only its own Cancel/X button ever closes it.
  private requestCloseSubject: Subject<void> = new Subject<void>();
  public requestClose$: Observable<void> = this.requestCloseSubject.asObservable();

  // Fired by ModalComponent whenever the dialog actually closes, regardless of how (Cancel/X click, or a
  // requestClose() from here) - confirm() below subscribes to this once per call to resolve `false` if the
  // user backs out without confirming, since ModalButtonConfig callbacks have no return value to key off of.
  private dialogClosedSubject: Subject<void> = new Subject<void>();
  public dialogClosed$: Observable<void> = this.dialogClosedSubject.asObservable();

  constructor() { }

  registerHost(container: ViewContainerRef) {
    this.hostContainer = container;
  }

  projectComponent<T>(componentType: Type<T>): ComponentRef<T> | null {
    if (!this.hostContainer) return null;
    this.clearHost();
    this.projectedComponent = this.hostContainer.createComponent(componentType);
    return this.projectedComponent;
  }

  clearHost() {
    if (this.hostContainer)
      this.hostContainer.clear();
  }

  openDialog(modalConfig: ModalConfig): void {
    this.openDialogSubject.next(modalConfig);
  }

  requestClose(): void {
    this.requestCloseSubject.next();
  }

  notifyClosed(): void {
    this.dialogClosedSubject.next();
  }

  // Custom, app-styled replacement for window.confirm() - projects a small message-only body into the
  // shared <app-modal> (same mechanism EqualizerComponent uses) with a single confirm action alongside the
  // dialog's always-present Cancel/X. Resolves true only if that confirm action is clicked; resolves false
  // for every other way the dialog can close (Cancel/X, or anything else that ends up calling notifyClosed).
  confirm(title: string, message: string, options?: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const projectedInstance = this.projectComponent(ConfirmDialogComponent);
      if (!projectedInstance) {
        resolve(false);
        return;
      }

      projectedInstance.instance.message = message;

      let settled = false;
      const closedSubscription = this.dialogClosed$.subscribe(() => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
        closedSubscription.unsubscribe();
      });

      this.openDialog(new ModalConfig(title, [
        new ModalButtonConfig(
          options?.confirmText ?? 'Delete',
          options?.confirmIcon ?? 'bin',
          options?.confirmColor ?? '#FF0000',
          ModalButtonType.primary,
          () => {
            settled = true;
            resolve(true);
            this.requestClose();
          }
        )
      ]));
    });
  }
}
