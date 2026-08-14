import { Component, Input } from '@angular/core';

// Projected into <app-modal> via ModalService.confirm() the same way EqualizerComponent is projected
// from Settings/track-information - a tiny, single-purpose body for yes/no confirmations so the app never
// has to fall back to the browser's native window.confirm(), which doesn't match the app's styling and
// blocks the whole UI thread while it's open.
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  @Input() message: string = '';
}
