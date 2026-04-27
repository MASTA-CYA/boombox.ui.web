import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { IPlaylistTrack } from "../interfaces/playlist-track";
import { getDurationFromSeconds } from "../../../common/functions";

export class PlaylistTrack implements IPlaylistTrack {
	image: string;
	album: string;
	name: string;
	artist: string;
	playedDuration: number;
	totalDuration: number;
	isPlaying: boolean;
	isFavourite: boolean;
	path: string;

	displayPlayedDuration: string;
	displayTotalDuration: string;
	displayImage: SafeResourceUrl | undefined;

	constructor(playbackInformation: IPlaylistTrack, private sanitizer?: DomSanitizer) {
		this.image = playbackInformation.image;
		this.album = playbackInformation.album;
		this.name = playbackInformation.name;
		this.artist = playbackInformation.artist;
		this.playedDuration = Math.floor(playbackInformation.playedDuration);
		this.totalDuration = Math.floor(playbackInformation.totalDuration);
		this.isPlaying = playbackInformation.isPlaying;
		this.isFavourite = playbackInformation.isFavourite;
		this.path = playbackInformation.path;

		this.displayPlayedDuration = getDurationFromSeconds(playbackInformation.playedDuration);
		this.displayTotalDuration = getDurationFromSeconds(playbackInformation.totalDuration);

		if (sanitizer)
			this.displayImage = this.sanitizer!.bypassSecurityTrustResourceUrl(playbackInformation.image);
	}
}