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

@Component({
    selector: 'app-player',
    imports: [MatSliderModule, MatButtonModule, SvgIconComponent],
    templateUrl: './player.component.html',
    styleUrl: './player.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerComponent implements OnInit, OnDestroy {
    public playlist: PlaylistTrack[] | undefined;
    public playingTrack: PlaylistTrack | undefined;
    public selectedTrack: PlaylistTrack | undefined;
    public playerState: PlayerState | undefined;

    private playbackInformationSubscription!: Subscription;
    private userTrackDataSubscription!: Subscription;

    public showPlaylist: boolean = false;

    constructor(private playerService: PlayerService,
        private libraryService: LibraryService,
        private domSanitizer: DomSanitizer,
        private cdRef: ChangeDetectorRef,
        private ngZone: NgZone) { }

    async ngOnInit(): Promise<void> {
        this.playbackInformationSubscription = this.playerService.playbackInformation$.subscribe((info) =>
            this.ngZone.runOutsideAngular(() => this.handlePlaybackInformation(info)));
        this.userTrackDataSubscription = this.libraryService.userTrackData$.subscribe(track => this.handleUserTrackDataUpdated(track))
    }

    ngOnDestroy(): void {
        if (this.playbackInformationSubscription)
            this.playbackInformationSubscription.unsubscribe();

        if (this.userTrackDataSubscription)
            this.userTrackDataSubscription.unsubscribe();
    }

    togglePlaylist(): void {
        this.showPlaylist = !this.showPlaylist;
    }

    async playPrevious(): Promise<void> {
        await this.playerService.playPreviousAsync();
    }

    async playNext(): Promise<void> {
        await this.playerService.playNextAsync();
    }

    async playPauseAsync(action: string): Promise<void> {
        if (action === "play")
            await this.playerService.playAsync();
        else
            await this.playerService.pauseAsync();
    }

    async togglePlayerModeAsync(): Promise<void> {
        await this.playerService.togglePlayerModeAsync();
    }

    handlePlaybackInformation(info: IPlaybackInformation): void {
        this.playlist = info.tracks.map((track) => new PlaylistTrack(track, this.domSanitizer));
        this.playingTrack = this.playlist?.find(track => track.isPlaying);
        this.playerState = new PlayerState(info.playerState);

        this.cdRef.markForCheck();
        setInterval(() => {
            if (!this.selectedTrack) return;

            const selectedTrackButton = document.getElementById(this.selectedTrack?.path) as HTMLInputElement;
            selectedTrackButton.checked = true;
        }, 0);
    }

    private handleUserTrackDataUpdated(trackData: UserTrackData) {
        if (this.playingTrack?.path !== trackData.path) return;
        this.playingTrack.isFavourite = trackData.isFavourite;
    }

    async onMarkAsFavouriteClicked(path: string): Promise<void> {
        await this.libraryService.markAsFavouriteAsync(path);
    }

    onPlaylistTrackSelected(path: string): void {
        this.selectedTrack = this.playlist?.find(track => track.path === path);
    }

    async onDeleteTrackAsync(): Promise<void> {
        this.toggleActionButtons(true);

        if (this.selectedTrack)
            await this.playerService.removePlaylistTrackAsync([this.selectedTrack?.path]);

        this.toggleActionButtons(false);
    }

    async onShiftUpClickedAsync(): Promise<void> {
        this.toggleActionButtons(true);
        const currentIndex = this.playlist?.findIndex(track => track.path == this.selectedTrack?.path);
        const newIndex = (currentIndex ?? 0) - 1;
        await this.sendShiftedPlaylistAsync(newIndex, currentIndex);
        this.toggleActionButtons(false);
    }

    async onShiftDownClickedAsync(): Promise<void> {
        this.toggleActionButtons(true);
        const currentIndex = this.playlist?.findIndex(track => track.path == this.selectedTrack?.path);
        const newIndex = (currentIndex ?? 0) + 1;
        await this.sendShiftedPlaylistAsync(newIndex, currentIndex);
        this.toggleActionButtons(false);
    }

    async sendShiftedPlaylistAsync(newIndex: number, currentIndex?: number,): Promise<void> {
        const shiftedPlaylist = [...this.playlist?.map(track => track.path) ?? []];

        if (newIndex < 0 || newIndex >= shiftedPlaylist.length || !currentIndex) return;

        [shiftedPlaylist[currentIndex], shiftedPlaylist[newIndex]] = [shiftedPlaylist[newIndex], shiftedPlaylist[currentIndex]];
        await this.playerService.reorderNowPlayingPlaylistAsync(shiftedPlaylist);
    }

    private toggleActionButtons(enabled: boolean): void {
        setInterval(() => {
            const shiftUpButton = document.getElementById("shift-up") as HTMLInputElement;
            shiftUpButton.disabled = enabled;
            const shiftDownButton = document.getElementById("shift-down") as HTMLInputElement;
            shiftDownButton.disabled = enabled;
            const deleteButton = document.getElementById("delete-track") as HTMLInputElement;
            deleteButton.disabled = enabled;
        }, 0);
    }
}
