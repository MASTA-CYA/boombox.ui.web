import { IPlayerState } from "../interfaces/player-state";

export interface IPlayerStateInformation {
	state: IPlayerState;
	hasQueuedTracks: boolean;
}

export class PlayerStateInformation implements IPlayerStateInformation {
	state: IPlayerState;
	hasQueuedTracks: boolean;

	constructor(state: IPlayerState, hasQueuedTracks: boolean) {
		this.state = state;
		this.hasQueuedTracks = hasQueuedTracks;
	}
}