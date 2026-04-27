import { Injectable } from '@angular/core';
import * as signalR from "@microsoft/signalr";
import { SnackbarService } from './snackbar.service';
import { getErrorMessage } from '../common/functions';
import { PlayerService } from './player.service';
import { PlaylistService } from './playlist.service';
import { LibraryService } from './library.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  private hubConnection: signalR.HubConnection;

  constructor(
    private snackbarService: SnackbarService,
    private playerService: PlayerService,
    private playlistService: PlaylistService,
    private libraryService: LibraryService) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.serverHubUrl, {
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

      this.listenForHubErrors();
      await this.libraryService.startConnectionAsync();
      await this.playerService.startConnectionAsync();
      await this.playlistService.startConnectionAsync();
    } catch (err) {
      this.snackbarService.showMessage("Error establishing connection with ServerHub: " + err)
      console.log("Error establishing connection with ServerHub: " + err)
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

}
