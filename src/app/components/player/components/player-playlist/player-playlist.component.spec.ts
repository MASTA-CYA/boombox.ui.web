import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerPlaylistComponent } from './player-playlist.component';

describe('PlayerPlaylistComponent', () => {
  let component: PlayerPlaylistComponent;
  let fixture: ComponentFixture<PlayerPlaylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerPlaylistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerPlaylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
