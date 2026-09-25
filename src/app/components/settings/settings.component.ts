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
    // Split from `runs` once per load (see loadHistoryAsync) rather than filtered inline in the template -
    // avoids re-filtering the whole list on every change-detection pass for what's otherwise a static split.
    // Mirrors the backend's MappingRunType enum (0 = FullScan, 1 = Cache), same convention as
    // functions.ts#getMappingRunTypeLabel.
    public cacheLoadRuns: MappingStatistic[] = [];
    public fullMappingRuns: MappingStatistic[] = [];

    public isLoadingEqualizerData: boolean = false;
    public hasLoadedEqualizerData: boolean = false;
    public equalizerPresets: IEqualizerPreset[] = [];
    public equalizerAssignments: ITrackEqualizerAssignment[] = [];

    // One run per bar (x = run.displayStartedAt, y = run duration in seconds) - replaces the old single
    // shared line chart, which plotted CPU/Memory samples *within* one selected run rather than a trend
    // across runs. Duration is the one number every run has that's actually meaningful to compare run-over-
    // run (directory/byte counts vary by what changed on disk, not by how the run performed).
    public cacheLoadChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
    public fullMappingChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

    public barChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                ticks: { color: '#FFFFFF', font: { family: 'Poppins' }, autoSkip: true, maxRotation: 0 },
                grid: { color: '#2A2A2A' },
            },
            y: {
                title: { display: true, text: 'Duration (s)', color: '#FFFFFF', font: { family: 'Poppins' } },
                ticks: { color: '#FFFFFF', font: { family: 'Poppins' } },
                grid: { color: '#2A2A2A' },
                min: 0,
            },
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

            // 0 = FullScan, 1 = Cache (mirrors the backend's MappingRunType enum - see functions.ts).
            this.cacheLoadRuns = this.runs.filter(run => run.runType === 1);
            this.fullMappingRuns = this.runs.filter(run => run.runType === 0);

            this.cacheLoadChartData = this.buildDurationChartData(this.cacheLoadRuns);
            this.fullMappingChartData = this.buildDurationChartData(this.fullMappingRuns);
        } finally {
            this.isLoadingHistory = false;
        }
    }

    // getMappingHistoryAsync returns newest-first (see MongoDbClient.GetMappingStatisticsAsync's
    // SortByDescending) - reversed here so the bar chart reads left-to-right oldest-to-newest, matching how
    // every other time-series chart in the app is read, while the tables above keep their existing
    // newest-first order.
    private buildDurationChartData(runs: MappingStatistic[]): ChartConfiguration<'bar'>['data'] {
        const chronological = [...runs].reverse();

        return {
            labels: chronological.map(run => run.displayStartedAt),
            datasets: [
                {
                    label: 'Duration (s)',
                    data: chronological.map(run => Math.round(run.durationMs / 1000)),
                    backgroundColor: '#710193',
                },
            ],
        };
    }
}
