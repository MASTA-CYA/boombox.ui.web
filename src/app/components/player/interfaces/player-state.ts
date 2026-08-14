export interface IPlayerState {
	isPlaying: boolean;
	hasNext: boolean;
	hasPrevious: boolean;
	mode: number;
	audioOutput: number;
	// Kept up to date by the backend's AudioOutputAvailabilityBroadcast loop, independent of playback state -
	// drives the sidebar greying out whichever output isn't currently reachable (Focusrite unplugged, HS80
	// unplugged, etc.) and preventing it from being selected.
	isSpeakersAvailable: boolean;
	isHeadsetAvailable: boolean;
}