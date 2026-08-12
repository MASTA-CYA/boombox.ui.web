export interface IMappingUpdate {
	percent: number;
	message: String;
	error: String;
	isComplete: boolean;
	directoryCount: number;
	mappedDirectories: number;
	startedAtUtc: string | null;
	cpuPercent: number;
	memoryMb: number;
}
