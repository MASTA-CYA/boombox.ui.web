import { IPlayerState } from "./player-state";
import { IPlaylistTrack } from "../../playlist/interfaces/playlist-track";

export interface IPlaybackInformation {
	playerState: IPlayerState;
	tracks: IPlaylistTrack[];
	hasReachedEndOfPlaylist: boolean;
}