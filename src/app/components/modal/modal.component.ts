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
  }

  onCloseClicked(): void {
    this.isModalOpen = false;
  }
}
