import { IEqualizerPreset } from "./equalizer-preset";

export interface ITrackEqualizerAssignment {
	albumName: string;
	albumPath: string;
	trackName: string;
	trackPath: string;
	presetGuid: string;
}

export interface IEqualizerManagementData {
	presets: IEqualizerPreset[];
	assignments: ITrackEqualizerAssignment[];
}
