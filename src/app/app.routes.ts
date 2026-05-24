import { ExtraOptions, RouterFeatures, Routes } from '@angular/router';
import { AlbumComponent } from './components/album/album.component';
import { LibraryComponent } from './components/library/library.component';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
	{ path: '', redirectTo: 'library', pathMatch: 'full', data: { reuse: true } },
	{ path: 'library', component: LibraryComponent, data: { name: 'LibraryComponent', reuse: true } },
	{ path: 'library', children: [{ path: 'album', component: AlbumComponent }] },
	{ path: 'playlist', component: PlaylistComponent },
	{ path: 'settings', component: SettingsComponent },
];
