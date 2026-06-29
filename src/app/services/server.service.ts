import { Injectable, NgZone } from '@angular/core';
import * as signalR from "@microsoft/signalr";
import { SnackbarService } from './snackbar.service';
import { getErrorMessage } from '../common/functions';
import { PlayerService } from './player.service';
import { PlaylistService } from './playlist.service';
import { LibraryService } from './library.service';
import { environment } from '../../environments/environment';
import { AutoScrollService } from './auto-scroll.service';
import { Observable, Subject, debounceTime } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServerService {
  private hubConnection: signalR.HubConnection;
  private serverConnectedSubject: Subject<boolean> = new Subject<boolean>();
  public serverConnected$: Observable<boolean> = this.serverConnectedSubject.asObservable();

  constructor(
    private snackbarService: SnackbarService,
    private playerService: PlayerService,
    private playlistService: PlaylistService,
    private libraryService: LibraryService,
    private autoScrollService: AutoScrollService,
    private ngZone: NgZone
  ) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.serverHubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Debug)
      .build();
    this.hubConnection.serverTimeoutInMilliseconds = 1200000;
    this.hubConnection.keepAliveIntervalInMilliseconds = 150000;
  }

  public async startConnectionAsync(): Promise<void> {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Disconnected)
        await this.hubConnection.start();

      await this.initServerServiceAsync();
      await this.libraryService.startConnectionAsync();
      await this.playerService.startConnectionAsync();
      await this.playlistService.startConnectionAsync();
      await this.playlistService.startConnectionAsync();
      await this.autoScrollService.startConnectionAsync();
    } catch (err) {
      this.serverConnectedSubject.next(false);
      this.snackbarService.showMessage("Error establishing connection with ServerHub: " + err);
      console.log("Error establishing connection with ServerHub: " + err);
    }
  }

  public handleDisconnects(): void {
    this.hubConnection.onclose(() => {
      console.log("Connection with PlayerHub lost");
    });
  }

  public listenForHubErrors(): void {
    this.hubConnection.on("ReceiveServerHubError", (err: string) => {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    });
  }

  private async initServerServiceAsync(): Promise<void> {
    this.listenForHubErrors();
    this.getServerUpdatesListener();
    await this.startServerStatusUpdatedAsync();
    this.serverConnectedSubject
      .pipe(debounceTime(10000))
      .subscribe(async _ => {
        this.serverConnectedSubject.next(await this.isServerRunningAsync());
      });
  }

  public async isServerRunningAsync(): Promise<boolean> {
    try {
      return await this.hubConnection.invoke('IsServerRunningAsync');
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
      return false;
    }
  }

  public async startServerStatusUpdatedAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke('StartServerStatusUpdatedAsync');
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async stopServerStatusUpdatedAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke('StopServerStatusUpdatedAsync');
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  private getServerUpdatesListener = () => {
    this.hubConnection.on('ReceiveServerUpdates', (response: string) => {
      this.ngZone.run(() => {
        try {
          this.serverConnectedSubject.next(true);
        } catch (err) {
          this.serverConnectedSubject.next(false);
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }
}
