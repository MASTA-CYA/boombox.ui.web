import { Injectable, NgZone } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { SnackbarService } from "./snackbar.service";
import { getErrorMessage } from "../common/functions";
import { Subject, ReplaySubject, Observable } from "rxjs";
import { IUserTrackData } from "../components/library/interfaces/user-track-data";
import { UserTrackData } from "../components/library/models/user-track-data";
import { IPlaybackInformation } from "../components/player/interfaces/playback-information";
import { environment } from "../../environments/environment";
import { IPlayerState } from "../components/player/interfaces/player-state";
import { PlaylistTrack } from "../components/playlist/models/playlist-track";
import { IEqualizerPreset } from "../components/player/components/equalizer/models/equalizer-preset";
import { IEqualizerManagementData } from "../components/player/components/equalizer/models/track-equalizer-assignment";
import { IPlayerStateInformation, PlayerStateInformation } from "../components/player/models/player-state-information";
import { ILyrics } from "../components/player/components/lyrics/models/lyrics";

@Injectable({
  providedIn: "root"
})
export class PlayerService {
  private hubConnection: signalR.HubConnection;
  // These three are fed from the same ReceivePlaybackInformation broadcast, which the app-initializer-blocking
  // getPlaybackInformationUpdateAsync() call can trigger before Angular has finished creating any components
  // (app initializers run before the root component tree exists). A plain Subject has no replay buffer, so that
  // first, correct broadcast would fire into the void - no subscribers yet - and be lost, leaving components
  // stuck on their compile-time defaults (e.g. "Speakers") until some unrelated later event happened to
  // broadcast again. ReplaySubject(1) replays the most recent value to any component that subscribes late.
  private playbackInformationSubject: ReplaySubject<IPlaybackInformation> = new ReplaySubject<IPlaybackInformation>(1);
  public playbackInformation$: Observable<IPlaybackInformation> = this.playbackInformationSubject.asObservable();

  private playerStateSubject: ReplaySubject<IPlayerState> = new ReplaySubject<IPlayerState>(1);
  public playerState$: Observable<IPlayerState> = this.playerStateSubject.asObservable();

  private playerStateHotkeysSubject: ReplaySubject<IPlayerStateInformation> = new ReplaySubject<IPlayerStateInformation>(1);
  public playerStateHotkeys$: Observable<IPlayerStateInformation> = this.playerStateHotkeysSubject.asObservable();

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
      // Without this, the client never learns the server's actual current state (audio output,
      // playback position, etc.) until something else happens to trigger a broadcast - so the UI
      // would show stale defaults (e.g. "Speakers") even though the backend restored a different
      // persisted output on startup.
      await this.getPlaybackInformationUpdateAsync();
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
          this.playerStateHotkeysSubject.next(new PlayerStateInformation(playbackInformation.playerState, playbackInformation.tracks?.length > 0));
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

  // Split in two so each consumer can be fed at its own cadence: the seek bar needs every playback tick to
  // keep its position current, while the track-info row (equalizer/favourite/lyrics icons) only wants to know
  // about actual track changes, since re-emitting on every tick would replay its entrance animation constantly.
  public broadcastSeekbarPlayingTrack(track: PlaylistTrack | undefined): void {
    if (!track) return;

    this.seekbarPlayingTrackSubject.next(track);
  }

  public broadcastTrackInfoPlayingTrack(track: PlaylistTrack | undefined): void {
    if (!track) return;

    this.trackInfoPlayingTrackSubject.next(track);
  }

  public updatePlayerLoadingState(isLoading: boolean): void {
    this.isPlayerLoadingSubject.next(isLoading);
  }

  public async getEqualizerPresetsAsync(): Promise<IEqualizerPreset[]> {
    try {
      const response = await this.hubConnection.invoke('GetEqualizerPresetsAsync');
      return JSON.parse(response) as IEqualizerPreset[];
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
      return [];
    }
  }

  public async setEqualizerPresetsAsync(preset: IEqualizerPreset): Promise<void> {
    try {
      await this.hubConnection.invoke('SetEqualizerPresetsAsync', preset);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    }
  }

  // Backs Settings' "Equalizer" tab - management of the shared named presets, and the list of tracks that have
  // their own custom ("Saved") preset assigned. Kept on PlayerService/PlayerHub rather than a Settings-specific
  // service, matching where getEqualizerPresetsAsync/setEqualizerPresetsAsync above already live.
  public async getEqualizerManagementDataAsync(): Promise<IEqualizerManagementData> {
    try {
      const response = await this.hubConnection.invoke('GetEqualizerManagementDataAsync');
      return JSON.parse(response) as IEqualizerManagementData;
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
      return { presets: [], assignments: [] };
    }
  }

  public async createEqualizerPresetAsync(name: string): Promise<IEqualizerPreset | undefined> {
    try {
      const response = await this.hubConnection.invoke('CreateEqualizerPresetAsync', name);
      return JSON.parse(response) as IEqualizerPreset;
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
      return undefined;
    }
  }

  public async updateNamedEqualizerPresetAsync(preset: IEqualizerPreset): Promise<void> {
    try {
      await this.hubConnection.invoke('UpdateNamedEqualizerPresetAsync', preset);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    }
  }

  public async deleteEqualizerPresetAsync(guid: string): Promise<void> {
    try {
      await this.hubConnection.invoke('DeleteEqualizerPresetAsync', guid);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    }
  }

  public async getTrackEqualizerPresetAsync(trackPath: string): Promise<IEqualizerPreset | undefined> {
    try {
      const response = await this.hubConnection.invoke('GetTrackEqualizerPresetAsync', trackPath);
      const preset = JSON.parse(response);
      return preset ?? undefined;
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
      return undefined;
    }
  }

  public async updateTrackEqualizerPresetAsync(trackPath: string, preset: IEqualizerPreset): Promise<void> {
    try {
      await this.hubConnection.invoke('UpdateTrackEqualizerPresetAsync', trackPath, preset);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    }
  }

  public async deleteTrackEqualizerPresetAsync(trackPath: string): Promise<void> {
    try {
      await this.hubConnection.invoke('DeleteTrackEqualizerPresetAsync', trackPath);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    }
  }

  // Lyrics dialog, opened from TrackInformationComponent - same on-demand-fetch shape as
  // getTrackEqualizerPresetAsync above (undefined on failure rather than throwing, so the dialog can render an
  // empty/error-friendly state instead of crashing). GetTrackLyricsAsync can occasionally take noticeably
  // longer than other hub calls the first time it's invoked for a given track (LRCLIB round-trip on a cache
  // miss) - every call after that for the same track is a fast Mongo lookup.
  public async getTrackLyricsAsync(trackPath: string): Promise<ILyrics | undefined> {
    try {
      const response = await this.hubConnection.invoke('GetTrackLyricsAsync', trackPath);
      const lyrics = JSON.parse(response);
      return lyrics ?? undefined;
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
      return undefined;
    }
  }

  // The manual paste-in fallback, used when none of the automated sources (embedded tag, LRCLIB, .lrc
  // sidecar) turned anything up - saves whatever the user pastes (plain text or LRC-formatted) against the
  // track, overwriting any prior NotFound/other result.
  public async saveManualLyricsAsync(trackPath: string, rawText: string): Promise<ILyrics | undefined> {
    try {
      const response = await this.hubConnection.invoke('SaveManualLyricsAsync', trackPath, rawText);
      const lyrics = JSON.parse(response);
      return lyrics ?? undefined;
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
      return undefined;
    }
  }

  public async setAudioOutputAsync(output: number): Promise<void> {
    try {
      await this.hubConnection.invoke('SetAudioOutputAsync', output);
    } catch (err) {
      this.snackbarService.showMessage(getErrorMessage(err));
      console.log(err);
    }
  }
}
