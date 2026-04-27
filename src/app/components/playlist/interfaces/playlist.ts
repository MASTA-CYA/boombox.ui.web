import { IPlaylistTrack } from "./playlist-track";

export interface IPlaylist {
	name: string;
	canEdit: boolean;
	tracks: IPlaylistTrack[]
}