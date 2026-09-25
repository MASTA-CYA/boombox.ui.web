import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { PlayerService } from '../../../../services/player.service';
import { IEqualizerFrequencyBand } from './models/equalizer-frequency-band';
import { IEqualizerPreset } from './models/equalizer-preset';
import { ModalService } from '../../../../services/modal.service';

// 'player' (default): the original behaviour, unchanged - edits apply to whatever's currently playing.
// 'named-preset': editing one of the shared presets from Settings (e.g. "Bass Boost" itself).
// 'track-preset': editing a specific track's own custom ("Saved") preset from Settings, independent of
// whatever's currently playing.
export type EqualizerEditMode = 'player' | 'named-preset' | 'track-preset';

@Component({
  selector: 'app-equalizer',
  imports: [MatSliderModule, FormsModule],
  templateUrl: './equalizer.component.html',
  styleUrl: './equalizer.component.css'
})
export class EqualizerComponent implements OnInit {
  // Settings passes its own already-fetched preset list in (avoids a redundant fetch, and lets it pass the
  // full unfiltered set it already has) - when omitted, falls back to the original playerService fetch.
  @Input() presets: IEqualizerPreset[] | undefined;
  // Preselects this specific preset instead of the "Saved"/"Flat" default lookup below - needed for
  // named-preset/track-preset mode, where the thing being edited generally isn't either of those.
  @Input() initialPreset: IEqualizerPreset | undefined;
  @Input() mode: EqualizerEditMode = 'player';
  // Required when mode === 'track-preset' - identifies which track's assignment apply() writes to.
  @Input() trackPath: string | undefined;
  // Display-only, for the "editing" heading (trackPath is a full absolute path, not something to show as a
  // title) - required when mode === 'track-preset', unused otherwise.
  @Input() trackName: string | undefined;
  @Input() showBypass: boolean = true;
  // Switching the "Preset:" dropdown while editing a specific named/track preset would silently redirect what
  // Apply saves (named-preset mode keys off selectedPreset.guid, so picking a different preset from the list
  // would edit THAT one instead) - hidden outside 'player' mode to avoid that footgun. Exposed as an input
  // rather than hard-coded to `mode === 'player'` in case that judgment call needs to be overridden later.
  @Input() showPresetSelector: boolean = true;
  // Lets a caller (e.g. Settings) know a save completed, so it can refresh its own list without polling.
  @Output() presetSaved = new EventEmitter<IEqualizerPreset>();

  equalizerPresetsOptions: [string, string][] = [];
  equalizerPresetsBands: IEqualizerPreset[] = [];
  selectedPreset: IEqualizerPreset | undefined;

  constructor(private playerService: PlayerService) { }

  async ngOnInit(): Promise<void> {
    this.equalizerPresetsBands = this.presets ?? await this.playerService.getEqualizerPresetsAsync();
    this.selectedPreset = this.initialPreset
      ?? this.equalizerPresetsBands.find(preset => preset.name === "Saved" || preset.name === "Flat");
    this.equalizerPresetsOptions = this.equalizerPresetsBands.map(preset => [preset.name, preset.name]);
  }

  onBandGainChanged(event: Event, band: IEqualizerFrequencyBand): void {
    band.gain = parseFloat((event.target as HTMLInputElement).value);
  }

  onBandGainScroll(event: WheelEvent, band: IEqualizerFrequencyBand): void {
    event.preventDefault();

    const delta = Math.sign(event.deltaY);
    const step = 1;

    if (delta > 0)
      band.gain = band.gain - step;
    else
      band.gain = band.gain + step;
  }

  onEqPresetChanged(selectedPreset: string) {
    this.selectedPreset = this.equalizerPresetsBands.find(preset => preset.name.toLowerCase() === selectedPreset.toLowerCase());
  }

  onBypassToggled(byPass: boolean) {
    if (!this.selectedPreset) return;

    let preset: IEqualizerPreset;
    if (byPass) {
      preset = {
        ...this.selectedPreset,
        frequencyBands: this.selectedPreset.frequencyBands.map(band => ({
          ...band,
          gain: 0
        }))
      };
      preset.name = "Bypass"
      preset.frequencyBands = preset!.frequencyBands.map(band => {
        band.gain = 0;
        return band;
      });
    } else {
      preset = this.selectedPreset;
    }
    this.playerService.setEqualizerPresetsAsync(preset);
  }

  async apply(): Promise<void> {
    if (!this.selectedPreset) return;

    switch (this.mode) {
      case 'named-preset':
        await this.playerService.updateNamedEqualizerPresetAsync(this.selectedPreset);
        break;
      case 'track-preset':
        if (!this.trackPath) return;
        await this.playerService.updateTrackEqualizerPresetAsync(this.trackPath, this.selectedPreset);
        break;
      case 'player':
      default:
        await this.playerService.setEqualizerPresetsAsync(this.selectedPreset);
        break;
    }

    this.presetSaved.emit(this.selectedPreset);
  }

  reset(): void {
    if (!this.selectedPreset) return;
    this.selectedPreset!.frequencyBands = this.selectedPreset?.frequencyBands.map(band => {
      band.gain = 0;
      return band;
    });
  }
}
