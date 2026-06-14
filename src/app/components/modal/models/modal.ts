export class ModalConfig {
	title: string;
	buttons: ModalButtonConfig[];

	constructor(title: string, buttons: ModalButtonConfig[]) {
		this.title = title;
		this.buttons = buttons;
	}
}

type CallerCallback = () => any;

export class ModalButtonConfig {
	text: string;
	icon: string;
	color: string;
	type: ModalButtonType;
	callback: CallerCallback;

	constructor(text: string, icon: string, color: string, type: ModalButtonType, callback: CallerCallback) {
		this.text = text;
		this.icon = icon;
		this.color = color;
		this.type = type;
		this.callback = callback;
	}
}

export enum ModalButtonType {
	primary,
	secondary
}