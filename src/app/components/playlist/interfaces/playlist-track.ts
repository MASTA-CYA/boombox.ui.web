export interface IPlaylistTrack {
	image: string;
	album: string;
	name: string;
	artist: string;
	playedDuration: number;
	totalDuration: number;
	isPlaying: boolean;
	isFavourite: boolean;
	path: string;
}