import * as utils from './utils.js';

export class TrashItem {
    public icon: any;
    public filename: string;
    public trashPath: string;
    public infoPath: string;
    public restorePath: string;
    public deletedAt: string;

    constructor(
        icon: any,
        filename: string,
        trashPath: string,
        infoPath: string,
        deletedAt: string,
        restorePath: string,
    ) {
        this.icon = icon;
        this.filename = filename;
        this.trashPath = trashPath;
        this.infoPath = infoPath;
        this.deletedAt = deletedAt;
        this.restorePath = restorePath;
    }

    display(): string {
        return utils.truncate(this.filename, 32);
    }
}
