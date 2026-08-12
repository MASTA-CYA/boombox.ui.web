export interface IMappingStatisticSample {
	timestampUtc: string;
	cpuPercent: number;
	memoryMb: number;
}

export interface IMappingStatistic {
	id: string;
	startedAtUtc: string;
	completedAtUtc: string;
	durationMs: number;
	directoryCount: number;
	mappedDirectories: number;
	bytesBroadcast: number;
	error: string | null;
	samples: IMappingStatisticSample[];
}
