const moduleID = 'empire-economy';

const lg = x => console.log(x);


Hooks.once('init', () => {
    game.settings.register(moduleID, 'empireName0', {
        name: 'Empire 1 Name',
        scope: 'world',
        config: true,
        requiresReload: false,
        type: String,
        default: 'Empire 1'
    });

    game.settings.register(moduleID, 'empireName1', {
        name: 'Empire 2 Name',
        scope: 'world',
        config: true,
        requiresReload: false,
        type: String,
        default: 'Empire 2'
    });

    game.settings.register(moduleID, 'empireName2', {
        name: 'Empire 3 Name',
        scope: 'world',
        config: true,
        requiresReload: false,
        type: String,
        default: 'Empire 3'
    });

    if (foundry.utils.isNewerVersion(game.system.version, '3.1.2')) libWrapper.register(moduleID, 'dnd5e.dataModels.actor.AttributesFields.prepareEncumbrance', newPrepareEncumbrance, 'WRAPPER');
    else libWrapper.register(moduleID, 'dnd5e.documents.Actor5e.prototype._prepareEncumbrance', oldPrepareEncumbrance, 'WRAPPER');
    libWrapper.register(moduleID, 'dnd5e.dataModels.item.ContainerData.prototype.currencyWeight', newGetCurrencyWeight, 'WRAPPER');
});


Hooks.on('renderActorSheet5eCharacter2', (app, [html], appData) => {
    const { actor } = app;
    const currentEmpire = parseInt(actor.getFlag(moduleID, 'currentEmpire') ?? 0);

    const empireSelect = document.createElement('select');
    empireSelect.name = `flags.${moduleID}.currentEmpire`;
    empireSelect.style.width = '100px';
    empireSelect.style.margin = 'auto';
    empireSelect.innerHTML = ``;
    for (let empireID = 0; empireID < 3; empireID++) {
        const empireName = game.settings.get(moduleID, `empireName${empireID}`);
        empireSelect.innerHTML += `<option value="${empireID}" ${empireID === currentEmpire ? 'selected' : ''}>${empireName}</option>`;
    }
    empireSelect.addEventListener('change', async event => {
        await actor.update({
            flags: {
                [moduleID]: {
                    currentEmpire: event.target.value,
                    [`empire${currentEmpire}`]: actor.system.currency
                }
            },
            system: {
                currency: actor.getFlag(moduleID, `empire${event.target.value}`) ?? {
                    "pp": 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0
                }
            }
        });

        const containerUpdates = [];
        for (const item of actor.items) {
            if (item.type !== 'container') continue;

            containerUpdates.push({
                _id: item._id,
                flags: {
                    [moduleID]: {
                        currentEmpire: event.target.value,
                        [`empire${currentEmpire}`]: item.system.currency
                    }
                },
                system: {
                    currency: item.getFlag(moduleID, `empire${event.target.value}`) ?? {
                        "pp": 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0
                    }
                }
            });
        }

        await actor.updateEmbeddedDocuments('Item', containerUpdates)
    });
    html.querySelector('section.currency').appendChild(empireSelect);
});

Hooks.on('renderContainerSheet', (app, [html], appData) => {
    const { item } = app;
    const { actor } = item;
    if (!actor) return;

    const currentEmpire = parseInt(actor.getFlag(moduleID, 'currentEmpire') ?? 0);

    const empireSelect = document.createElement('select');
    empireSelect.name = `flags.${moduleID}.currentEmpire`;
    empireSelect.disabled = true;
    empireSelect.style.width = '100px';
    empireSelect.style.margin = 'auto';
    empireSelect.innerHTML = ``;
    empireSelect.dataset.tooltip = 'Change on character sheet';
    for (let empireID = 0; empireID < 3; empireID++) {
        const empireName = game.settings.get(moduleID, `empireName${empireID}`);
        empireSelect.innerHTML += `<option value="${empireID}" ${empireID === currentEmpire ? 'selected' : ''}>${empireName}</option>`;
    }
    html.querySelector('ol.currency').appendChild(empireSelect);
});


function newPrepareEncumbrance(wrapped, rollData, { validateItem } = {}) {
    wrapped(rollData, validateItem);

    if (!game.settings.get('dnd5e', 'currencyWeight')) return;

    const encumbrance = this.attributes.encumbrance;
    if (!encumbrance) return;

    const config = CONFIG.DND5E.encumbrance;
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[this.parent.type]
        ?? CONFIG.DND5E.encumbrance.baseUnits.default;
    const unitSystem = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";

    let weight = encumbrance.value;

    const currentEmpire = parseInt(this.parent?.getFlag(moduleID, 'currentEmpire') ?? 0);
    for (let empireID = 0; empireID < 3; empireID++) {
        if (empireID === currentEmpire) continue;

        const currency = this.parent?.getFlag(moduleID, `empire${empireID}`) ?? {
            "pp": 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0
        };
        const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
        const currencyPerWeight = config.currencyPerWeight[unitSystem];
        weight += dnd5e.utils.convertWeight(
            numCoins / currencyPerWeight,
            config.baseUnits.default[unitSystem],
            baseUnits[unitSystem]
        );
    }

    encumbrance.value = weight.toNearest(0.1);
    encumbrance.pct = Math.clamp((encumbrance.value * 100) / encumbrance.max, 0, 100);
    encumbrance.encumbered = encumbrance.value > encumbrance.heavilyEncumbered;
}

function oldPrepareEncumbrance(wrapped) {
    wrapped();

    if (!game.settings.get('dnd5e', 'currencyWeight')) return;

    const config = CONFIG.DND5E.encumbrance;
    const encumbrance = this.system.attributes.encumbrance ??= {};
    const units = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";

    let weight = encumbrance.value;

    const currentEmpire = parseInt(this?.getFlag(moduleID, 'currentEmpire') ?? 0);
    for (let empireID = 0; empireID < 3; empireID++) {
        if (empireID === currentEmpire) continue;

        const currency = this.getFlag(moduleID, `empire${empireID}`) ?? {
            "pp": 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0
        };
        const numCoins = Object.values(currency).reduce((val, denom) => val + Math.max(denom, 0), 0);
        const currencyPerWeight = config.currencyPerWeight[units];
        weight += numCoins / currencyPerWeight;
    }

    encumbrance.value = weight.toNearest(0.1);
    encumbrance.pct = Math.clamped((encumbrance.value * 100) / encumbrance.max, 0, 100);
    encumbrance.encumbered = encumbrance.value > encumbrance.heavilyEncumbered;
}

function newGetCurrencyWeight(wrapped) {
    let weight = wrapped();
    if (!game.settings.get('dnd5e', 'currencyWeight')) return weight;

    const currentEmpire = parseInt(this.parent?.getFlag(moduleID, 'currentEmpire') ?? 0);
    for (let empireID = 0; empireID < 3; empireID++) {
        if (empireID === currentEmpire) continue;

        const currency = this.parent?.getFlag(moduleID, `empire${empireID}`) ?? {
            "pp": 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0
        };
        const count = Object.values(currency).reduce((count, value) => count + value, 0);
        const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
            ? CONFIG.DND5E.encumbrance.currencyPerWeight.metric
            : CONFIG.DND5E.encumbrance.currencyPerWeight.imperial;
        weight += count / currencyPerWeight;
    }

    return weight;
}
