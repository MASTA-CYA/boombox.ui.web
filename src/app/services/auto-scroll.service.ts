import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IScrollPosition } from '../components/library/interfaces/scroll-position';
import { ScrollPosition } from '../components/library/models/scroll-position';

@Injectable({
  providedIn: 'root'
})
export class AutoScrollService {
  private scrollPosition: BehaviorSubject<ScrollPosition> = new BehaviorSubject<ScrollPosition>(new ScrollPosition(0, 0));
  public scrollPosition$: Observable<ScrollPosition> = this.scrollPosition.asObservable();

  constructor() { }

  updateScrollPositionSubject(position: IScrollPosition) {
    this.scrollPosition.next(new ScrollPosition(position.horizontal, position.vertical));
  }
}
