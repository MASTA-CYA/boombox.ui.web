import { IEqualizerFrequencyBand } from "./equalizer-frequency-band";

export interface IEqualizerPreset {
	// id/guid/isDefault already came through in every response (the backend always serializes the full C#
	// EqualizerPreset), they just weren't declared here since nothing needed to read them yet - the Settings
	// "Equalizer" tab does (guid identifies a preset for update/delete; isDefault distinguishes the shared
	// named presets from a track's own "Saved" one).
	id?: string;
	guid: string;
	name: string;
	frequencyBands: IEqualizerFrequencyBand[];
	isDefault: boolean;
}
