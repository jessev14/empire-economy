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
    empireSelect.addEventListener('change', event => {
        return actor.update({
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
    });
    html.querySelector('section.currency').appendChild(empireSelect);
});
