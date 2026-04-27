import { Injectable, NgZone } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { SnackbarService } from "./snackbar.service";
import { getErrorMessage } from "../common/functions";
import { Subject, Observable } from "rxjs";
import { IUserTrackData } from "../components/library/interfaces/user-track-data";
import { UserTrackData } from "../components/library/models/user-track-data";
import { IPlaybackInformation } from "../components/player/interfaces/playback-information";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root"
})
export class PlayerService {
  private hubConnection: signalR.HubConnection;
  private playbackInformationSubject: Subject<IPlaybackInformation> = new Subject<IPlaybackInformation>();
  public playbackInformation$: Observable<IPlaybackInformation> = this.playbackInformationSubject.asObservable();
  private userTrackDataSubject: Subject<UserTrackData> = new Subject<UserTrackData>();
  public userTrackData$: Observable<UserTrackData> = this.userTrackDataSubject.asObservable();

  constructor(private ngZone: NgZone, private snackbarService: SnackbarService) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.playerHubUrl, {
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

      await this.initializePlayerAsync();
      this.getPlaybackInformationListener();
      this.listenForHubErrors();
      this.getUserTrackDataListener();
    } catch (err) {
      this.snackbarService.showMessage("Error establishing connection with PlayerHub: " + err)
      console.log("Error establishing connection with PlayerHub: " + err)
    }
  }

  public handleDisconnects(): void {
    this.hubConnection.onclose(() => {
      console.log("Connection with PlayerHub lost");
    });
  }

  public async initializePlayerAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("InitializePlayerAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public listenForHubErrors(): void {
    this.hubConnection.on("ReceivePlayerHubError", (err: string) => {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    });
  }

  public async getPlaybackInformationUpdateAsync(): Promise<void> {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Connected)
        await this.hubConnection.invoke("GetPlaybackInformationUpdateAsync");
      else
        console.log("Unable call GetPlaybackInformationUpdateAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public getPlaybackInformationListener = () => {
    this.hubConnection.on("ReceivePlaybackInformation", (response: string) => {
      this.ngZone.run(() => {
        try {
          const playbackInformation = JSON.parse(response) as IPlaybackInformation;
          this.playbackInformationSubject.next(playbackInformation);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  public async playAsync(paths?: string[]): Promise<void> {
    try {
      await this.hubConnection.invoke("PlayAsync", paths);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async pauseAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("PauseAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async playNextAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("PlayNextAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async playPreviousAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("PlayPreviousAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async togglePlayerModeAsync(): Promise<void> {
    try {
      await this.hubConnection.invoke("TogglePlayerModeAsync");
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async reorderNowPlayingPlaylistAsync(paths: string[]): Promise<void> {
    try {
      await this.hubConnection.invoke("ReorderNowPlayingAsync", paths);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async addToNowPlayingAsync(paths: string[], canAppend: boolean, indexPath?: string): Promise<void> {
    try {
      await this.hubConnection.invoke("AddToNowPlayingAsync", paths, canAppend, indexPath);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.error(err);
    }
  }

  public async removePlaylistTrackAsync(paths: string[]): Promise<void> {
    try {
      await this.hubConnection.invoke("RemoveNowPlayingTrackAsync", paths);
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
