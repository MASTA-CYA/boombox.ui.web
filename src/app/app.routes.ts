import { Routes } from '@angular/router';
import { LibraryComponent } from './library/library.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
	{ path: '', redirectTo: 'library', pathMatch: 'full' },
	{ path: 'library', component: LibraryComponent },
	{ path: 'settings', component: SettingsComponent },
];
