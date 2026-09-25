import { getDisplayBytes, getDurationFromSeconds, getMappingRunTypeLabel } from "../../../common/functions";
import { IMappingStatistic, IMappingStatisticSample } from "../interfaces/mapping-statistic";

export class MappingStatisticSample implements IMappingStatisticSample {
	timestampUtc: string;
	cpuPercent: number;
	memoryMb: number;

	constructor(sample: IMappingStatisticSample) {
		this.timestampUtc = sample.timestampUtc;
		this.cpuPercent = sample.cpuPercent;
		this.memoryMb = sample.memoryMb;
	}
}

export class MappingStatistic implements IMappingStatistic {
	id: string;
	runType: number;
	startedAtUtc: string;
	completedAtUtc: string;
	durationMs: number;
	directoryCount: number;
	mappedDirectories: number;
	bytesBroadcast: number;
	error: string | null;
	samples: MappingStatisticSample[];

	displayStartedAt: string;
	displayDuration: string;
	displayBytesBroadcast: string;
	displayRunType: string;

	constructor(statistic: IMappingStatistic) {
		this.id = statistic.id;
		this.runType = statistic.runType;
		this.startedAtUtc = statistic.startedAtUtc;
		this.completedAtUtc = statistic.completedAtUtc;
		this.durationMs = statistic.durationMs;
		this.directoryCount = statistic.directoryCount;
		this.mappedDirectories = statistic.mappedDirectories;
		this.bytesBroadcast = statistic.bytesBroadcast;
		this.error = statistic.error;
		this.samples = (statistic.samples ?? []).map(sample => new MappingStatisticSample(sample));

		this.displayStartedAt = new Date(this.startedAtUtc).toLocaleString();
		this.displayDuration = getDurationFromSeconds(this.durationMs / 1000);
		this.displayBytesBroadcast = getDisplayBytes(this.bytesBroadcast);
		this.displayRunType = getMappingRunTypeLabel(this.runType);
	}
}
