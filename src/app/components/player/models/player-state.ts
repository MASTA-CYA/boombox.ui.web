import { IPlayerState } from "../interfaces/player-state";

export class PlayerState implements IPlayerState {
	isPlaying: boolean;
	hasNext: boolean;
	hasPrevious: boolean;
	mode: number;
	audioOutput: number;
	isSpeakersAvailable: boolean;
	isHeadsetAvailable: boolean;

	modeImageName: string;

	constructor(state: IPlayerState) {
		this.isPlaying = state.isPlaying;
		this.hasNext = state.hasNext;
		this.hasPrevious = state.hasPrevious;
		this.mode = state.mode;
		this.audioOutput = state.audioOutput;
		this.isSpeakersAvailable = state.isSpeakersAvailable;
		this.isHeadsetAvailable = state.isHeadsetAvailable;

		this.modeImageName = this.getImageName(state.mode);
	}

	getImageName(mode: number): string {
		switch (mode) {
			case 1:
				return "shuffle";
			case 2:
				return "repeat"
			case 3:
				return "repeat-1"
			case 0:
			default:
				return "play-one";
		}
	}
}