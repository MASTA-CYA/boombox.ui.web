import { getDurationFromSeconds } from "../../../common/functions";
import { ITrack } from "../interfaces/track";

export class Track implements ITrack {
	discNumber: number;
	trackNumber: number;
	name: string;
	artist: string;
	duration: number;
	displayDuration: string;
	timesPlayed: number;
	isFavourite: boolean;
	path: string;

	constructor(track: ITrack) {
		this.discNumber = track.discNumber;
		this.trackNumber = track.trackNumber;
		this.name = track.name;
		this.artist = track.artist;
		this.duration = track.duration;
		this.timesPlayed = track.timesPlayed;
		this.isFavourite = track.isFavourite;
		this.path = track.path;

		this.displayDuration = getDurationFromSeconds(track.duration);
	}

	toSanitizedTrack(): ITrack {
		const { displayDuration, ...track } = this;
		return track;
	}

	toJsonString(): string {
		const { displayDuration, ...track } = this;
		return JSON.stringify(track);
	}
}