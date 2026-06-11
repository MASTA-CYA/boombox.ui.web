import { ComponentRef, Injectable, Type, ViewContainerRef } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private hostContainer!: ViewContainerRef;

  private openDialogSubject: Subject<void> = new Subject();
  public openDialog$: Observable<void> = this.openDialogSubject.asObservable();
  
  constructor() { }
  
  // Register the container from the component
  registerHost(container: ViewContainerRef) {
    this.hostContainer = container;
  }

  projectComponent<T>(componentType: Type<T>): ComponentRef<T> | null {
    if (!this.hostContainer) return null;
    
    this.hostContainer.clear(); // Clear existing content
    return this.hostContainer.createComponent(componentType);
  }

  // Clear content
  clearHost() {
    if (this.hostContainer) {
      this.hostContainer.clear();
    }
  }

  openDialog(): void {
    this.openDialogSubject.next();
  }
}
