import { AfterContentInit, AfterViewInit, Component, ContentChild, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  imports: [SvgIconComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent implements AfterViewInit {
  @ViewChild('modalContent') modalContent!: ElementRef;

  isOpen: boolean = false;
  title: string | undefined;

  constructor(private modalService: ModalService) {
    this.modalService.openDialog$.subscribe(() => this.isOpen = true);
  }

  ngAfterViewInit(): void {
    if (!this.modalContent) return;
    this.modalService.registerHost(this.modalContent.nativeElement); // no work
  }

  onCloseClicked(): void {
    this.isOpen = false;
  }
}
