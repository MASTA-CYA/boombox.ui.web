import { IUserTrackData } from "../interfaces/user-track-data";

export class UserTrackData implements IUserTrackData {
	path: string;
	timesPlayed: number;
	isFavourite: boolean;

	constructor(data: IUserTrackData) {
		this.path = data.path;
		this.timesPlayed = data.timesPlayed;
		this.isFavourite = data.isFavourite;
	}
}