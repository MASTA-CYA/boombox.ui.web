import { ComponentRef, Injectable, Type, ViewContainerRef } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ModalConfig } from '../components/modal/models/modal';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private hostContainer!: ViewContainerRef;
  public projectedComponent: ComponentRef<any> | undefined;

  private openDialogSubject: Subject<ModalConfig> = new Subject<ModalConfig>();
  public openDialog$: Observable<ModalConfig> = this.openDialogSubject.asObservable();
  
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
}
