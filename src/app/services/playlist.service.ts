import { Injectable, NgZone } from "@angular/core";
import { SnackbarService } from "./snackbar.service";
import * as signalR from "@microsoft/signalr";
import { getErrorMessage } from "../common/functions";
import { Subject, Observable, Subscription, timer } from "rxjs";
import { IUserTrackData } from "../components/library/interfaces/user-track-data";
import { UserTrackData } from "../components/library/models/user-track-data";
import { IPlaylist } from "../components/playlist/interfaces/playlist";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root"
})
export class PlaylistService {
  private hubConnection: signalR.HubConnection;
  private playlistsSubject: Subject<IPlaylist[]> = new Subject<IPlaylist[]>();
  public playlists$: Observable<IPlaylist[]> = this.playlistsSubject.asObservable();
  private userTrackDataSubject: Subject<UserTrackData> = new Subject<UserTrackData>();
  public userTrackData$: Observable<UserTrackData> = this.userTrackDataSubject.asObservable();

  constructor(private ngZone: NgZone, private snackbarService: SnackbarService) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.playlistHubUrl, {
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
      this.getPlaylistListener();
      this.getUserTrackDataListener();
      await this.startPlaylistBroadcastAsync();
    } catch (err) {
      this.snackbarService.showMessage("Error establishing connection with LibraryHub: " + err)
      console.log("Error establishing connection with PlaylistHub: " + err)
    }
  }

  public handleDisconnects(): void {
    this.hubConnection.onclose(() => {
      console.log("Connection with PlaylistHub lost");
    });
  }

  public listenForHubErrors(): void {
    this.hubConnection.on("ReceivePlaylistHubError", (err: string) => {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    });
  }

  public async getPlaylistsAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("GetPlaylistsAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public getPlaylistListener = (): void => {
    this.hubConnection.on("ReceivePlaylists", (response: string) => {
      this.ngZone.run(() => {
        try {
          const playlists = JSON.parse(response) as IPlaylist[];
          this.playlistsSubject.next(playlists);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  public async startPlaylistBroadcastAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("StartPlayingUpdatesAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async stopPlaylistBroadcastAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("StopPlayingUpdatesAsync");
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
}
