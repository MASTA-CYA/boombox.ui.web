import { IEqualizerFrequencyBand } from "./equalizer-frequency-band";

export interface IEqualizerPreset {
	name: string;
	frequencyBands: IEqualizerFrequencyBand[];
}
