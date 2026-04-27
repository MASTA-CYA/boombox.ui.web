import { ITrack } from "./track"

export interface IAlbum {
	name: string;
	artist: string;
	genre: string;
	year: number;
	numberOfTracks: number;
	duration: number;
	image: string;
	encoding: string;
	dateMapped: Date;
	tracks: ITrack[];
}