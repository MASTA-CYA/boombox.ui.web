import { IPlaybackInformation } from "../interfaces/playback-information";
import { IPlayerState } from "../interfaces/player-state";
import { IPlaylistTrack } from "../../playlist/interfaces/playlist-track";

export class PlaybackInformation implements IPlaybackInformation {
	playerState: IPlayerState;
	tracks: IPlaylistTrack[];
	hasReachedEndOfPlaylist: boolean;

	constructor(playbackInformation: IPlaybackInformation) {
		this.playerState = playbackInformation.playerState;
		this.tracks = playbackInformation.tracks;
		this.hasReachedEndOfPlaylist = playbackInformation.hasReachedEndOfPlaylist;
	}
}