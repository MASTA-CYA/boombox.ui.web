import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { SnackbarService } from './snackbar.service';
import { getErrorMessage } from '../common/functions';
import { IAlbum } from '../components/library/interfaces/album';
import { IMappingUpdate } from '../components/library/interfaces/update';
import { IUserTrackData } from '../components/library/interfaces/user-track-data';
import { Album } from '../components/library/models/album';
import { UserTrackData } from '../components/library/models/user-track-data';
import { SearchModel } from '../components/search-bar/models/search-model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private hubConnection: signalR.HubConnection;
  private albumSubject: Subject<IAlbum[]> = new Subject<IAlbum[]>();
  public albums$: Observable<IAlbum[]> = this.albumSubject.asObservable();
  private mappingUpdateSubject: Subject<IMappingUpdate> = new Subject<IMappingUpdate>();
  public mappingUpdate$: Observable<IMappingUpdate> = this.mappingUpdateSubject.asObservable();
  private filterLibrarySubject: Subject<SearchModel> = new Subject<SearchModel>();
  public filterLibraryUpdate$: Observable<SearchModel> = this.filterLibrarySubject.asObservable();
  private userTrackDataSubject: Subject<UserTrackData> = new Subject<UserTrackData>();
  public userTrackData$: Observable<UserTrackData> = this.userTrackDataSubject.asObservable();
  private localCacheClearedSubject: Subject<boolean> = new Subject<boolean>();
  public localCacheCleared$: Observable<boolean> = this.localCacheClearedSubject.asObservable();

  private selectedAlbum: Album | undefined;

  constructor(
    private ngZone: NgZone,
    private snackbarService: SnackbarService,
  ) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.libraryHubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Debug)
      .build();
    this.hubConnection.serverTimeoutInMilliseconds = 600000;
    this.hubConnection.keepAliveIntervalInMilliseconds = 150000;
  }

  public async startConnectionAsync(): Promise<void> {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Disconnected)
        await this.hubConnection.start();

      this.getLibraryListener();
      this.getMappingUpdateListener();
      this.getUserTrackDataListener();
      this.receiveLocalCacheClearedListener();
    } catch (err) {
      this.snackbarService.showMessage('Error establishing connection with LibraryHub: ' + err)
      console.log('Error establishing connection with LibraryHub: ' + err)
    }
  }

  public handleDisconnects(): void {
    this.hubConnection.onclose(() => {
      console.log('Connection with LibraryHub lost');
    });
  }

  public async getLibraryAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke('GetLibraryAsync');
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  private getLibraryListener = () => {
    this.hubConnection.on('ReceiveLibrary', (response: string) => {
      this.ngZone.run(() => {
        try {
          this.mapAlbums(response);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  private getMappingUpdateListener = () => {
    this.hubConnection.on('ReceiveMappingUpdate', (response: string) => {
      this.ngZone.run(() => {
        try {
          const mappingUpdate = JSON.parse(response) as IMappingUpdate;
          this.mappingUpdateSubject.next(mappingUpdate);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  public async updateSelectedAlbumAsync(album: IAlbum): Promise<void> {
    try {
      await this.hubConnection.invoke('UpdateSelectedAlbumAsync', JSON.stringify(album), album.path);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async setSelectedAlbumAsync(album: Album, cachedAlbum: IAlbum): Promise<void> {
    this.selectedAlbum = album;
    await this.updateSelectedAlbumAsync(cachedAlbum);
  }

  public async getCachedSelectedAlbumAsync(): Promise<IAlbum | undefined> {
    try {
      const response = await this.hubConnection.invoke('GetSelectedAlbumAsync');
      return JSON.parse(response) as IAlbum;
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
      return;
    }
  }

  public async markAsFavouriteAsync(path: string): Promise<void> {
    try {
      await this.hubConnection.invoke('MarkAsFavoriteAsync', path);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  private getUserTrackDataListener = () => {
    this.hubConnection.on('ReceiveTrackUserData', (response: string) => {
      this.ngZone.run(() => {
        try {
          const trackData = JSON.parse(response) as IUserTrackData;
          this.userTrackDataSubject.next(trackData);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  public getSelectedAlbum(): Album | undefined {
    return this.selectedAlbum;
  }

  public filterLibrary(searchModel: SearchModel): void {
    this.filterLibrarySubject.next(searchModel);
  }

  public async clearLocalCacheAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke('ClearLocalCacheAsync');
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  private receiveLocalCacheClearedListener = () => {
    this.hubConnection.on('ReceiveLocalCacheCleared', (response: string) => {
      this.ngZone.run(() => {
        try {
          this.localCacheClearedSubject.next(true);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  private mapAlbums(response: string): void {
    const albumsJson = JSON.parse(response) as {}[];
    let albums: IAlbum[] = [];

    for (const album of albumsJson.values())
      albums.push(album as IAlbum);

    this.albumSubject.next(albums ?? []);
  }
}
