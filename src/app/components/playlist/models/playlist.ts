import { IPlaylist } from "../interfaces/playlist";
import { IPlaylistTrack } from "../interfaces/playlist-track";

export class Playlist implements IPlaylist {
	name: string;
	canEdit: boolean;
	tracks: IPlaylistTrack[];

	constructor(playlist: IPlaylist) {
		this.name = playlist.name;
		this.tracks = playlist.tracks;
		this.canEdit = playlist.canEdit;
	}
}