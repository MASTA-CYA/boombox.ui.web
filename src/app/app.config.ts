import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject, runInInjectionContext } from '@angular/core';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding, withDebugTracing, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideSvgIcons, provideSvgIconsConfig } from '@ngneat/svg-icon';
import * as icons from './svg';
import { ServerService } from './services/server.service';
import { CustomRouteReuseStrategy } from './common/re-use-strategy';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideCharts(withDefaultRegisterables()),
    provideAppInitializer(async () => await inject(ServerService).startConnectionAsync()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy },
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      }), withDebugTracing()),
    provideAnimationsAsync(),
    provideSvgIconsConfig({
      sizes: {
        xs: '10px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '25px',
        xxl: '30px',
        xxxl: '35px',
      },
      defaultSize: 'md'
    }), provideSvgIcons([
      icons.cdIcon,
      icons.playlistIcon,
      icons.settingsIcon,
      icons.numberSignIcon,
      icons.flameIcon,
      icons.extensionIcon,
      icons.infoIcon,
      icons.lyricsIcon,
      icons.playOneIcon,
      icons.shuffleIcon,
      icons.repeat1Icon,
      icons.repeatIcon,
      icons.previousIcon,
      icons.playIcon,
      icons.pauseIcon,
      icons.nextIcon,
      icons.calenderIcon,
      icons.calenderAddIcon,
      icons.genreIcon,
      icons.stopwatchIcon,
      icons.addIcon,
      icons.searchIcon,
      icons.clearIcon,
      icons.upArrowIcon,
      icons.downArrowIcon,
      icons.binIcon,
      icons.cancelIcon,
      icons.beforeIcon,
      icons.afterIcon,
      icons.folderIcon,
      icons.equalizerIcon,
      icons.saveIcon,
      icons.undoIcon,
      icons.powerIcon,
      icons.restartIcon,
    ])]
};
