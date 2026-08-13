import { IMappingUpdate } from "../interfaces/update";

export class MappingUpdate implements IMappingUpdate{
	percent: number;
	message: String;
	error: String;
	isComplete: boolean;
	directoryCount: number;
	mappedDirectories: number;
	startedAtUtc: string | null;
	cpuPercent: number;
	memoryMb: number;
	bytesBroadcast: number;
	runType: number;

	constructor(
		percent: number,
		message: String,
		error: String,
		isComplete: boolean,
		directoryCount: number = 0,
		mappedDirectories: number = 0,
		startedAtUtc: string | null = null,
		cpuPercent: number = 0,
		memoryMb: number = 0,
		bytesBroadcast: number = 0,
		runType: number = 0,
	) {
		this.percent = percent;
		this.message = message;
		this.error = error;
		this.isComplete = isComplete;
		this.directoryCount = directoryCount;
		this.mappedDirectories = mappedDirectories;
		this.startedAtUtc = startedAtUtc;
		this.cpuPercent = cpuPercent;
		this.memoryMb = memoryMb;
		this.bytesBroadcast = bytesBroadcast;
		this.runType = runType;
	}
}
