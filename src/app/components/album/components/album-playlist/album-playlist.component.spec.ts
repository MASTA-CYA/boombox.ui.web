import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumPlaylistComponent } from './album-playlist.component';

describe('AlbumPlaylistComponent', () => {
  let component: AlbumPlaylistComponent;
  let fixture: ComponentFixture<AlbumPlaylistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumPlaylistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlbumPlaylistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
