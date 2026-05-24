import { Component, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, OnInit, OnDestroy } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { SvgIconComponent } from "@ngneat/svg-icon";
import { PlayerService } from '../../services/player.service';
import { Subscription } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { PlaylistTrack } from '../playlist/models/playlist-track';
import { PlayerState } from './models/player-state';
import { IPlaybackInformation } from './interfaces/playback-information';
import { LibraryService } from '../../services/library.service';
import { UserTrackData } from '../library/models/user-track-data';
import { PlayerActionsComponent } from './components/player-actions/player-actions.component';
import { SeekBarComponent } from "./components/seek-bar/seek-bar.component";
import { TrackInformationComponent } from "./components/track-information/track-information.component";
import { PlayerPlaylistComponent } from "./components/player-playlist/player-playlist.component";

@Component({
    selector: 'app-player',
    imports: [MatSliderModule, MatButtonModule, PlayerActionsComponent, SeekBarComponent, TrackInformationComponent, PlayerPlaylistComponent],
    templateUrl: './player.component.html',
    styleUrl: './player.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerComponent implements OnInit, OnDestroy {
    public playlist: PlaylistTrack[] | undefined;
    public playingTrack: PlaylistTrack | undefined;
    public isPlayerLoading: boolean = false;


    private playbackInformationSubscription!: Subscription;
    private userTrackDataSubscription!: Subscription;
    private isPlayerLoadingSubscription!: Subscription;

    public showPlaylist: boolean = false;
    private canUpdatePlayerPlaylist: boolean = false;

    constructor(
        private playerService: PlayerService,
        private domSanitizer: DomSanitizer,
        private cdRef: ChangeDetectorRef,
        private ngZone: NgZone
    ) { }

    async ngOnInit(): Promise<void> {
        this.isPlayerLoadingSubscription = this.playerService.isPlayerLoading$.subscribe((isLoading) => {
            this.isPlayerLoading = isLoading;
            this.cdRef.markForCheck();
        });
        this.playbackInformationSubscription = this.playerService.playbackInformation$.subscribe((info) =>
            this.ngZone.runOutsideAngular(() => this.handlePlaybackInformation(info)));
    }

    ngOnDestroy(): void {
        if (this.playbackInformationSubscription)
            this.playbackInformationSubscription.unsubscribe();

        if (this.userTrackDataSubscription)
            this.userTrackDataSubscription.unsubscribe();

        if (this.isPlayerLoadingSubscription)
            this.isPlayerLoadingSubscription.unsubscribe();
    }

    handlePlaybackInformation(info: IPlaybackInformation): void {
        if (info.hasReachedEndOfPlaylist)
            this.playerService.updatePlayerLoadingState(false);
        
        const playlistTracks = info.tracks.map((track) => new PlaylistTrack(track, this.domSanitizer));
        this.playingTrack = playlistTracks.find(track => track.isPlaying);
        this.playerService.broadcastPlayingTrack(this.playingTrack);

        const hasMatchingTrackPaths = this.playlist?.every(track => playlistTracks.map(otherTrack => otherTrack.path).includes(track.path));
        const currentPlayingTrack = this.playlist?.find(track => track.isPlaying);
        const nextPlayingTrack = playlistTracks?.find(track => track.isPlaying);
        const hasPlayingTrackChanged = currentPlayingTrack?.path !== nextPlayingTrack?.path;

        if (this.playlist && this.playlist.length > 0 && hasMatchingTrackPaths && !hasPlayingTrackChanged && !this.canUpdatePlayerPlaylist) return;
        this.playlist = playlistTracks;
        this.cdRef.markForCheck();
    }

    togglePlaylist(data: boolean) {
        this.showPlaylist = data;
    }

    receivePlayerPlaylist(canUpdate: boolean) {
        this.canUpdatePlayerPlaylist = canUpdate;
    }
}
