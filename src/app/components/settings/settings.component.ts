import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { LibraryService } from '../../services/library.service';
import { PlayerService } from '../../services/player.service';
import { ModalService } from '../../services/modal.service';
import { MappingStatistic } from '../library/models/mapping-statistic';
import { EqualizerComponent } from '../player/components/equalizer/equalizer.component';
import { ModalButtonConfig, ModalButtonType, ModalConfig } from '../modal/models/modal';
import { IEqualizerPreset } from '../player/components/equalizer/models/equalizer-preset';
import { ITrackEqualizerAssignment } from '../player/components/equalizer/models/track-equalizer-assignment';

type SettingsTab = 'settings' | 'equalizer' | 'mapping-statistics';

@Component({
    selector: 'app-settings',
    imports: [BaseChartDirective],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
    public activeTab: SettingsTab = 'settings';
    public isLoadingHistory: boolean = false;
    public hasLoadedHistory: boolean = false;
    public runs: MappingStatistic[] = [];
    public selectedRun: MappingStatistic | undefined;

    public isLoadingEqualizerData: boolean = false;
    public hasLoadedEqualizerData: boolean = false;
    public equalizerPresets: IEqualizerPreset[] = [];
    public equalizerAssignments: ITrackEqualizerAssignment[] = [];

    public chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

    public chartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: {
                ticks: { color: '#FFFFFF', font: { family: 'Poppins' } },
                grid: { color: '#2A2A2A' },
            },
            y: {
                position: 'left',
                title: { display: true, text: 'CPU %', color: '#710193', font: { family: 'Poppins' } },
                ticks: { color: '#710193', font: { family: 'Poppins' } },
                grid: { color: '#2A2A2A' },
                min: 0,
            },
            y1: {
                position: 'right',
                title: { display: true, text: 'Memory (MB)', color: '#FFFFFF', font: { family: 'Poppins' } },
                ticks: { color: '#FFFFFF', font: { family: 'Poppins' } },
                grid: { display: false },
                min: 0,
            },
        },
        plugins: {
            legend: { labels: { color: '#FFFFFF', font: { family: 'Poppins' } } },
        },
    };

    constructor(
        private libraryService: LibraryService,
        private playerService: PlayerService,
        private modalService: ModalService
    ) { }

    public async onTabSelected(tab: SettingsTab): Promise<void> {
        this.activeTab = tab;

        if (tab === 'mapping-statistics' && !this.hasLoadedHistory)
            await this.loadHistoryAsync();

        if (tab === 'equalizer' && !this.hasLoadedEqualizerData)
            await this.loadEqualizerDataAsync();
    }

    public onRunSelected(run: MappingStatistic): void {
        this.selectedRun = run;
        this.chartData = this.buildChartData(run);
    }

    public async onNewPresetClicked(): Promise<void> {
        const name = window.prompt("New preset name:")?.trim();
        if (!name) return;

        const preset = await this.playerService.createEqualizerPresetAsync(name);
        if (!preset) return;

        await this.loadEqualizerDataAsync();
        this.openEqualizerEditor('named-preset', preset);
    }

    public onEditPresetClicked(preset: IEqualizerPreset): void {
        this.openEqualizerEditor('named-preset', preset);
    }

    public async onDeletePresetClicked(preset: IEqualizerPreset): Promise<void> {
        const confirmed = await this.modalService.confirm(
            "Delete Preset",
            `Delete preset "${preset.name}"? Any tracks currently using it will revert to no custom preset.`
        );
        if (!confirmed) return;

        await this.playerService.deleteEqualizerPresetAsync(preset.guid);
        await this.loadEqualizerDataAsync();
    }

    public async onEditTrackPresetClicked(assignment: ITrackEqualizerAssignment): Promise<void> {
        // The assignments list only carries each track's assigned preset Guid, not its full band data (see
        // GetTrackEqualizerAssignmentsAsync) - fetched on demand here since it's only needed once the user
        // actually opens it for editing.
        const preset = await this.playerService.getTrackEqualizerPresetAsync(assignment.trackPath);
        if (!preset) return;

        this.openEqualizerEditor('track-preset', preset, assignment.trackPath, assignment.trackName);
    }

    public async onDeleteTrackPresetClicked(assignment: ITrackEqualizerAssignment): Promise<void> {
        const confirmed = await this.modalService.confirm(
            "Delete Track Preset",
            `Permanently delete the custom preset for "${assignment.trackName}"? This can't be undone.`
        );
        if (!confirmed) return;

        await this.playerService.deleteTrackEqualizerPresetAsync(assignment.trackPath);
        await this.loadEqualizerDataAsync();
    }

    private async loadEqualizerDataAsync(): Promise<void> {
        this.isLoadingEqualizerData = true;

        try {
            const data = await this.playerService.getEqualizerManagementDataAsync();
            this.equalizerPresets = data.presets;
            this.equalizerAssignments = data.assignments;
            this.hasLoadedEqualizerData = true;
        } finally {
            this.isLoadingEqualizerData = false;
        }
    }

    // Shared by the "Presets" and "Track Presets" sections - same dialog (the same one the player's own
    // equalizer icon opens), just pointed at a different save target and with the bypass switch/preset-picker
    // hidden (see EqualizerComponent's mode input) since both are editing one specific, already-chosen preset.
    // Title is always "Equalizer", matching the player's own dialog - the preset/track name and (for a track)
    // its path are shown inside the dialog body instead (EqualizerComponent's equalizer-editing-info block).
    private openEqualizerEditor(mode: 'named-preset' | 'track-preset', initialPreset: IEqualizerPreset, trackPath?: string, trackName?: string): void {
        const projectedInstance = this.modalService.projectComponent(EqualizerComponent);
        if (!projectedInstance) return;

        projectedInstance.instance.mode = mode;
        projectedInstance.instance.presets = this.equalizerPresets;
        projectedInstance.instance.initialPreset = initialPreset;
        projectedInstance.instance.trackPath = trackPath;
        projectedInstance.instance.trackName = trackName;
        projectedInstance.instance.showBypass = false;
        projectedInstance.instance.showPresetSelector = false;
        projectedInstance.instance.presetSaved.subscribe(() => this.loadEqualizerDataAsync());

        this.modalService.openDialog(new ModalConfig("Equalizer", [
            new ModalButtonConfig("Reset", "undo", "#0000FF", ModalButtonType.primary, () => projectedInstance!.instance.reset()),
            new ModalButtonConfig("Apply", "save", "#710193", ModalButtonType.primary, () => projectedInstance!.instance.apply())
        ]));
    }

    private async loadHistoryAsync(): Promise<void> {
        this.isLoadingHistory = true;

        try {
            this.runs = await this.libraryService.getMappingHistoryAsync();
            this.hasLoadedHistory = true;

            if (this.runs.length > 0)
                this.onRunSelected(this.runs[0]);
        } finally {
            this.isLoadingHistory = false;
        }
    }

    private buildChartData(run: MappingStatistic): ChartConfiguration<'line'>['data'] {
        const runStartedAt = new Date(run.startedAtUtc).getTime();
        const labels = run.samples.map(sample => {
            const elapsedSeconds = Math.max(0, Math.round((new Date(sample.timestampUtc).getTime() - runStartedAt) / 1000));
            return `${elapsedSeconds}s`;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'CPU %',
                    data: run.samples.map(sample => sample.cpuPercent),
                    borderColor: '#710193',
                    backgroundColor: '#710193',
                    yAxisID: 'y',
                    tension: 0.3,
                    pointRadius: 0,
                },
                {
                    label: 'Memory (MB)',
                    data: run.samples.map(sample => sample.memoryMb),
                    borderColor: '#FFFFFF',
                    backgroundColor: '#FFFFFF',
                    yAxisID: 'y1',
                    tension: 0.3,
                    pointRadius: 0,
                },
            ],
        };
    }
}
