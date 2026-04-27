import { IMappingUpdate } from "../interfaces/update";

export class MappingUpdate implements IMappingUpdate{
	percent: number;
	message: String;
	error: String;
	isComplete: boolean;

	constructor(percent: number, message: String, error: String, isComplete: boolean) {
		this.percent = percent;
		this.message = message;
		this.error = error;
		this.isComplete = isComplete;
	}
}	