import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumSearchBarComponent } from './album-search-bar.component';

describe('AlbumSearchBarComponent', () => {
  let component: AlbumSearchBarComponent;
  let fixture: ComponentFixture<AlbumSearchBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumSearchBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlbumSearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
