import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { LibraryService } from '../../services/library.service';
import { MappingStatistic } from '../library/models/mapping-statistic';

type SettingsTab = 'settings' | 'mapping-statistics';

@Component({
    selector: 'app-settings',
    imports: [DecimalPipe, BaseChartDirective],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
    public activeTab: SettingsTab = 'settings';
    public isLoadingHistory: boolean = false;
    public hasLoadedHistory: boolean = false;
    public runs: MappingStatistic[] = [];
    public selectedRun: MappingStatistic | undefined;

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

    constructor(private libraryService: LibraryService) { }

    public async onTabSelected(tab: SettingsTab): Promise<void> {
        this.activeTab = tab;

        if (tab === 'mapping-statistics' && !this.hasLoadedHistory)
            await this.loadHistoryAsync();
    }

    public onRunSelected(run: MappingStatistic): void {
        this.selectedRun = run;
        this.chartData = this.buildChartData(run);
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
