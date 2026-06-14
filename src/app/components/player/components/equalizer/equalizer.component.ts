import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { PlayerService } from '../../../../services/player.service';
import { IEqualizerFrequencyBand } from './models/equalizer-frequency-band';
import { IEqualizerPreset } from './models/equalizer-preset';
import { ModalService } from '../../../../services/modal.service';

@Component({
  selector: 'app-equalizer',
  imports: [MatSliderModule, FormsModule],
  templateUrl: './equalizer.component.html',
  styleUrl: './equalizer.component.css'
})
export class EqualizerComponent implements OnInit {
  equalizerPresetsOptions: [string, string][] = [];
  equalizerPresetsBands: IEqualizerPreset[] = [];
  selectedPreset: IEqualizerPreset | undefined;

  constructor(private playerService: PlayerService) { }

  async ngOnInit(): Promise<void> {
    this.equalizerPresetsBands = await this.playerService.getEqualizerPresetsAsync();
    this.selectedPreset = this.equalizerPresetsBands[0];
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

  apply(): void {
    if (!this.selectedPreset) return;
    this.playerService.setEqualizerPresetsAsync(this.selectedPreset!);
  }

  reset(): void {
    if (!this.selectedPreset) return;
    this.selectedPreset!.frequencyBands = this.selectedPreset?.frequencyBands.map(band => {
      band.gain = 0;
      return band;
    });
  }
}
