import { Component } from '@angular/core';
import { ModalService } from '../../services/modal.service';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { ModalConfig, ModalButtonType } from './models/modal';

@Component({
  selector: 'app-modal',
  imports: [SvgIconComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  isModalOpen: boolean = false;
  config: ModalConfig | undefined;

  constructor(private modalService: ModalService) {
    this.modalService.openDialog$.subscribe((modalConfig: ModalConfig) => {
      if (!this.isModalOpen)
        this.isModalOpen = true;

      this.config = modalConfig;
    });

    // Lets a caller close the dialog itself (e.g. ModalService.confirm(), once its confirm button has been
    // clicked) - there was previously no way to close the dialog from outside a direct click on Cancel/X.
    this.modalService.requestClose$.subscribe(() => this.closeModal());
  }

  onCloseClicked(): void {
    this.closeModal();
  }

  private closeModal(): void {
    this.isModalOpen = false;
    // Notifies ModalService.confirm() (and anything else that cares) that the dialog has actually closed -
    // needed since ModalButtonConfig callbacks are fire-and-forget with no return value, so there's no other
    // way for a caller waiting on a Promise to learn the user backed out via Cancel/X instead of confirming.
    this.modalService.notifyClosed();
  }
}
