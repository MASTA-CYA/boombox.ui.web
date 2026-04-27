import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  imports: [],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.css'
})
export class ProgressBarComponent implements OnChanges {
  @Input() progress: number = 0;
  animatedProgress: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['progress']) {
      setTimeout(() => {
        this.animatedProgress = this.progress;
      }, 0);
    }
  }
}
