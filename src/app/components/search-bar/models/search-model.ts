import { OrderByOption } from "./orderby-option-enum";

export class SearchModel {
	searchText: string;
	orderByOption: OrderByOption | undefined;

	constructor(searchText: string, orderByOption?: OrderByOption) {
		this.searchText = searchText;
		this.orderByOption = orderByOption;
	}
}