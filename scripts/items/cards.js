/**
 * Creates all the decks, hands, and piles used to track cards
 * It then populates those with one copy of every item
 * NOTE that some cards share names and won't get >1 copy added in this way
 * @returns {Promise<void>}
 */
export async function init_decks() {
    let expected_deck_bases = [
        "Action Card",
        "Mutant Power",
        "Equipment",
        "Secret Society",
        "Bonus Duty",
    ];
    let deck_map = {
        "Action Card": "action_card",
        "Mutant Power": "mutant_power_card",
        "Equipment": "equipment_card",
        "Secret Society": "secret_society_card",
        "Bonus Duty": "bonus_duty_card",
    };

    for (const cur_base of expected_deck_bases) {
        let length;
        let deck_name;
        deck_name = `${cur_base} Deck`;
        length = game.cards.filter(i => i.name === deck_name).length;
        if (length === 0) {
            await Cards.create({
                name: deck_name,
                type: "deck",
            });
        }
        await populate_deck(deck_name, deck_map[cur_base]);

        deck_name = `${cur_base} Held`;
        length = game.cards.filter(i => i.name === deck_name).length;
        if (length === 0) {
            await Cards.create({
                name: deck_name,
                type: "pile",
            });
        }

        deck_name = `${cur_base} Discard`;
        length = game.cards.filter(i => i.name === deck_name).length;
        if (length === 0) {
            await Cards.create({
                name: deck_name,
                type: "hand",
            });
        }
    }
}

/**
 * Add all copies of existing cards to their appropriate deck so they can be drawn
 * @param deck_name - name of the deck to add cards to
 * @param item_type - type of item to look for
 * @returns {Promise<void>}
 */
async function populate_deck(deck_name, item_type) {
    let deck = game.cards.filter(i => i.name === deck_name)[0];
    for (const card of game.items.filter(i => i.type === item_type)) {
        let existing_card = deck.cards.filter(i => i.name === card.name);
        if (existing_card.length === 0) {
            // the card is not already added to the appropriate deck, add it
            await deck.createEmbeddedDocuments(
                "Card",
                [{
                    name: card.name,
                    type: "base",
                    face: 0,
                    faces: [{
                        name: card.name,
                        text: card.system.text,
                        img: card.img,
                    }],
                }],
            );
        }
    }
}

export async function deal_card(actor_id, card_data) {
    console.log("dealing card")
    console.log(actor_id)
    console.log(card_data)
    const card_name = card_data.name;
    const card_type = card_data.type;
    let deck_map = {
        "action_card": "Action Card",
        "equipment_card": "Equipment",
        "mutant_power_card": "Mutant Power",
        "bonus_duty_card": "Bonus Duty",
        "secret_society_card": "Secret Society",
    }
    let draw_deck = game.cards.find(i => i.name === `${deck_map[card_type]} Deck`);
    let discard_deck = game.cards.find(i => i.name === `${deck_map[card_type]} Discard`);
    let held_deck = game.cards.find(i => i.name === `${deck_map[card_type]} Held`);

    let found_card = draw_deck.cards.filter(i => i.name === card_name);
    let found_discard_card = discard_deck.cards.filter(i => i.name === card_name);

    if (found_card.length === 0) {
        found_card = await draw_deck.createEmbeddedDocuments(
            "Card",
            [{
                name: card_data.name,
                type: "base",
                face: 0,
                faces: [{
                    name: card_data.name,
                    text: card_data.system.text,
                    img: card_data.img,
                }],
            }],
        );
    } else if (found_card.filter(i => i.drawn === false).length === 0) {
        if (found_discard_card.length === 0) {
            // nothing available in the discard, create it
            found_card = await draw_deck.createEmbeddedDocuments(
                "Card",
                [{
                    name: card_data.name,
                    type: "base",
                    face: 0,
                    faces: [{
                        name: card_data.name,
                        text: card_data.system.text,
                        img: card_data.img,
                    }],
                }],
            );
        } else {
            // shuffle the discard into the deck
            for (const card of discard_deck.cards) {
                await discard_deck.pass(draw_deck, [card.id], {chatNotification: false});
            }
            await draw_deck.shuffle({chatNotification: false});
            found_card = draw_deck.cards.filter(i => i.name === card_name);
        }
    }
    if (found_card.length === 0) {
        console.log("could not find card; bad game state");
    }
    // at this point the card exists and has not yet been drawn
    // need to draw the specific card
    //await held_deck.draw(draw_deck, 1, {chatNotification: false});
    await draw_deck.pass(held_deck, [found_card[0].id], {chatNotification: false});
}

export class CardManager extends FormApplication {
    constructor(object = {}, options = {}) {
        super(object, options);
        if (options?.menu) {
            this.menu = options.menu;
        }
    }

    /** @override */
    getData() {
        const x = $(window).width();
        const y = $(window).height();
        this.position.left = x - 505;
        this.position.top = y - 80;
        this.width = 2000;
        let is_gm = game.user.isGM;
        return {
            is_gm: is_gm,
        };
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "card_manager",
            classes: ["paranoia"],
            title: "Card Manager",
            template: "systems/paranoia/templates/cards/manager.html",
        });
    }

    activateListeners(html) {
        const d = html.find("paranoia_card_manager_container")[0];
        new Draggable(this, html, d, this.options.resizable);

        $("#card_manager").css({bottom: "0px", right: "305px"});
        $(".paranoia .card_manager").click(this._handle_click.bind(this));
    }

    async _handle_click(context) {
        console.log("yes hello")
        let drawer = new card_draw();
        await drawer.render(true);
    }

    /** @override */
    _updateObject(event, formData) {

    };
}

export class card_draw extends FormApplication {
    constructor(object, options) {
        super(object, options)
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "Draw Cards",
            template: "systems/paranoia/templates/cards/draw.html"
        });
    }

    async getData(options = {}) {
        let data = await super.getData();
        data['decks'] = {
            "Action Card": "action_card",
            "Equipment Card": "equipment_card",
            "Mutant Power": "mutant_power_card",
            "Bonus Duty": "bonus_duty_card",
            "Secret Society": "secret_society_card",
        };
        let actors = {};
        let is_gm = game.user.isGM;
        if (is_gm) {
            //actors[game.user.character.id] = game.user.character.name;
            for (const user of game.users.filter(i => !i.isGM)) {
                actors[user.character.id] = `${user.character.name} (${user.name})`;
            }
        } else {
            actors[game.user.character.id] = game.user.character.name;
        }
        data['actors'] = actors;
        data['is_gm'] = is_gm;
        console.log("getData")
        console.log(data)
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        console.log("activating listeners")

        // TODO: refactor to use initial / real handlers
        //html.find(".progress_combat").click(this.initial_stage_transition.bind(this));
        //html.find(".card_selection").on("change", this._handle_my_card_selection.bind(this));
    }

    async _updateObject(event, formData) {
        console.log("_updateobject")
        if (!Array.isArray(formData['actors'])) {
            formData['actors'] = [formData['actors']];
        }
        console.log(formData)
        for (const cur_actor of formData['actors']) {
            if (!cur_actor) {
                // form submission includes null (unchecked) actors; just skip over them
                continue;
            }
            for (let x = 0; x < formData['draw_amount']; x++) {
                await this.draw_card(formData['deck'], cur_actor)
            }
        }
    }

    async draw_card(card_type, actor_id) {
        let deck_map = {
            "action_card": "Action Card",
            "equipment_card": "Equipment",
            "mutant_power_card": "Mutant Power",
            "bonus_duty_card": "Bonus Duty",
            "secret_society_card": "Secret Society",
        }
        let actor = game.actors.get(actor_id);
        let draw_deck = game.cards.find(i => i.name === `${deck_map[card_type]} Deck`);
        let discard_deck = game.cards.find(i => i.name === `${deck_map[card_type]} Discard`);
        let held_deck = game.cards.find(i => i.name === `${deck_map[card_type]} Held`);

        let length = draw_deck.cards.filter(i => !i.drawn).length;
        if (length === 0) {
            // the draw deck is empty, shuffle the discard into it
            for (const card of discard_deck.cards) {
                await discard_deck.pass(draw_deck, [card.id], {chatNotification: false});
            }
            await draw_deck.shuffle({chatNotification: false});
        }
        // ok, now draw
        // TODO: this may still end up with 0 cards (if they're all held). ...oh well
        let drawn_card = await held_deck.draw(draw_deck, 1, {chatNotification: false});

        game.socket.emit("system.paranoia", {type: "card", subtype: "draw", actor_id: actor_id})

        for (let card of drawn_card) {
            let item = game.items.find(i => i.name === card.name);
            if (!item) {
                console.log(`bad item: ${card.name}`)
                // TODO: this should probably delete the card
            } else {
                await actor.createEmbeddedDocuments("Item", [item]);
            }
        }
    }
}
