import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';


@Component({
  selector: 'app-main',
  imports: [RouterOutlet, CommonModule, ScrollingModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent {
}
