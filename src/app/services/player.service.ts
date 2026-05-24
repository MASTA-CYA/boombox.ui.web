import { Injectable, NgZone } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { SnackbarService } from "./snackbar.service";
import { getErrorMessage } from "../common/functions";
import { Subject, Observable } from "rxjs";
import { IUserTrackData } from "../components/library/interfaces/user-track-data";
import { UserTrackData } from "../components/library/models/user-track-data";
import { IPlaybackInformation } from "../components/player/interfaces/playback-information";
import { environment } from "../../environments/environment";
import { IPlayerState } from "../components/player/interfaces/player-state";
import { IPlaylistTrack } from "../components/playlist/interfaces/playlist-track";
import { PlaylistTrack } from "../components/playlist/models/playlist-track";

@Injectable({
  providedIn: "root"
})
export class PlayerService {
  private hubConnection: signalR.HubConnection;
  private playbackInformationSubject: Subject<IPlaybackInformation> = new Subject<IPlaybackInformation>();
  public playbackInformation$: Observable<IPlaybackInformation> = this.playbackInformationSubject.asObservable();

  private playerStateSubject: Subject<IPlayerState> = new Subject<IPlayerState>();
  public playerState$: Observable<IPlayerState> = this.playerStateSubject.asObservable();

  private seekbarPlayingTrackSubject: Subject<PlaylistTrack> = new Subject<PlaylistTrack>();
  public seekbarPlayingTrack$: Observable<PlaylistTrack> = this.seekbarPlayingTrackSubject.asObservable();
  private trackInfoPlayingTrackSubject: Subject<PlaylistTrack> = new Subject<PlaylistTrack>();
  public trackInfoPlayingTrack$: Observable<PlaylistTrack> = this.trackInfoPlayingTrackSubject.asObservable();

  private userTrackDataSubject: Subject<UserTrackData> = new Subject<UserTrackData>();
  public userTrackData$: Observable<UserTrackData> = this.userTrackDataSubject.asObservable();

  private isPlayerLoadingSubject: Subject<boolean> = new Subject<boolean>();
  public isPlayerLoading$: Observable<boolean> = this.isPlayerLoadingSubject.asObservable();

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
          this.playerStateSubject.next(playbackInformation.playerState);
        } catch (err) {
          this.snackbarService.showMessage(getErrorMessage(err));
          console.log(err);
        }
      });
    });
  }

  public async playAsync(paths?: string[]): Promise<void> {
    try {
      this.isPlayerLoadingSubject.next(true);
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

  public broadcastPlayingTrack(track: PlaylistTrack | undefined): void {
    if (!track) return;

    this.seekbarPlayingTrackSubject.next(track);
    this.trackInfoPlayingTrackSubject.next(track);

  }

  public updatePlayerLoadingState(isLoading: boolean): void {
    this.isPlayerLoadingSubject.next(isLoading);
  }
}
