import {computer_die, mutant_die, negative_node_die, node_die} from "./dice/dice.js";
import {roll_paranoia} from "./dice/roll.js";
import action_card_sheet from "./items/action_card.js";
import troubleshooter_sheet from "./actors/troubleshooter.js";
import {initiative_start} from "./combat/initiative.js";
import {socket_listener} from "./socket.js";
import {initiative_manager} from "./combat/initiative_manager.js";


Hooks.once("init", async function () {
    CONFIG.module = 'paranoia';
    //CONFIG.Dice.push(CONFIG.Dice.rolls[0]);
    let original_term = CONFIG.Dice.rolls[0];
    CONFIG.Dice.rolls[0] = roll_paranoia;
    //CONFIG.Dice.rolls.push(original_term);
    console.log("hello")
    CONFIG.Dice.terms["c"] = computer_die;
    CONFIG.Dice.terms["m"] = mutant_die;
    CONFIG.Dice.terms["n"] = node_die;
    CONFIG.Dice.terms["x"] = negative_node_die;

    Handlebars.registerHelper("json", JSON.stringify);
    Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        return {
            "+": lvalue + rvalue,
            "-": lvalue - rvalue,
            "*": lvalue * rvalue,
            "/": lvalue / rvalue,
            "%": lvalue % rvalue,
        }[operator];
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("paranoia", action_card_sheet, {makeDefault: true});
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("paranoia", troubleshooter_sheet, {makeDefault: true});

    //CONFIG.debug.hooks = true;
    game.socket.on("system.paranoia", socket_listener);
});

Hooks.on("combatStart", async function (combat_info, round_info) {
    let update_form = new initiative_manager(
        {},
        {
            width: "500",
            height: "auto",
            resizable: true,
            title: "Initiative Manager",
        }
    );
    await update_form.render(true);
    return await initiative_start(combat_info, round_info);
});

Hooks.on("combatRound", async function (combat_info, round_info, time_info) {
    // TODO: remove, just here for easy access to opening
    let update_form = new initiative_manager(
        {},
        {
            width: "500",
            height: "auto",
            resizable: true,
            title: "Initiative Manager",
        }
    );
    await update_form.render(true);
    return await initiative_start(combat_info, round_info, time_info);
});