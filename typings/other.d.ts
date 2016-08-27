/// <reference path="other/mithril.d.ts" />
/// <reference path="other/xlsx.d.ts" />

interface Window {
	saveAs(data: Blob | File, filename?: string, disableAutoBOM?: boolean) : void;
}
