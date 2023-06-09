export default class item_sheet_v1 extends ItemSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["boilerplate", "sheet", "item", "action_card"],
            width: 520,
            height: 700,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
        });
    }

    /** @override */
    get template() {
        return `systems/paranoia/templates/items/${this.item.type}.html`;
    }

    /** @override */
    getData() {
        // Values created here would only be available within this class or on the sheet's HTML template;
        // it would not be available through returning the item entity elsewhere.
        const data = super.getData();
        data.config = CONFIG.paranoia;
        return data;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Roll handlers, click handlers, etc. would go here.
    }
}

