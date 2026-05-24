import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser"
import { getDurationFromSeconds } from "../../../common/functions"
import { IAlbum } from "../interfaces/album"
import { Track } from "./track";

export class Album implements IAlbum {
	name: string;
	artist: string;
	genre: string;
	year: number;
	numberOfTracks: number;
	duration: number;
	image: string;
	encoding: string;
	dateMapped: Date;
	path: string;
	tracks: Track[];

	displayDuration: string;
	displayImage: SafeResourceUrl;
	displayFavoriteTracks: number;

	constructor(sanitizer: DomSanitizer, album: IAlbum);
	constructor(sanitizer: DomSanitizer, album: IAlbum, name: string, artist: string, genre: string, year: number, numberOfTracks: number, duration: number, image: string, encoding: string, dateMapped: Date, path: string, tracks: Track[]);

	constructor(private sanitizer: DomSanitizer,
		album?: IAlbum,
		name?: string,
		artist?: string,
		genre?: string,
		year?: number,
		numberOfTracks?: number,
		duration?: number,
		image?: string,
		encoding?: string,
		dateMapped?: Date,
		path?: string,
		tracks?: Track[]) {

		if (album) {
			this.name = album.name;
			this.artist = album.artist;
			this.genre = album.genre;
			this.year = album.year;
			this.numberOfTracks = album.numberOfTracks;
			this.duration = album.duration;
			this.image = album.image;
			this.tracks = album.tracks.map(track => new Track(track));
			this.encoding = album.encoding;
			this.dateMapped = album.dateMapped;
			this.path = album.path;

			this.displayDuration = getDurationFromSeconds(album.duration);
			this.displayImage = sanitizer.bypassSecurityTrustResourceUrl(album.image);
			this.displayFavoriteTracks = this.tracks?.reduce((accumulator, current) => accumulator + (current.isFavourite ? 1 : 0), 0);
		} else {
			this.name = name!;
			this.artist = artist!;
			this.genre = genre!;
			this.year = year!;
			this.numberOfTracks = numberOfTracks!;
			this.duration = duration!;
			this.image = image!;
			this.tracks = tracks!;
			this.encoding = encoding!;
			this.dateMapped = dateMapped!;
			this.path = path!;
	
			this.displayDuration = getDurationFromSeconds(duration!);
			this.displayImage = sanitizer.bypassSecurityTrustResourceUrl(image!);
			this.displayFavoriteTracks = this.tracks?.reduce((accumulator, current) => accumulator + (current.isFavourite ? 1 : 0), 0);
		}
	}

	toJsonString(): string {
		const { sanitizer, displayDuration, displayImage, tracks, ...album } = this;
		return JSON.stringify(album);
	}
}