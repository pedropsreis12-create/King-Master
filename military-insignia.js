/*
 * Brazilian Army rank insignia, redrawn as small, self-contained vectors.
 * Reference: RUE (EB10-R-12.004), 2025, Anexo B, items 1.2.1–1.2.6;
 * RUE 2015, Cap. IV, arts. 47–51 (arrangements and chevron grouping).
 * The ornamental banner is separate from these rank devices. No external
 * fonts, filters, IDs or sprite references: multiple badges can coexist.
 */
(function () {
    'use strict';

    const SILVER = '#e8edf0';
    const SILVER_DARK = '#83939c';
    const SILVER_LIGHT = '#ffffff';
    const GOLD = '#e3bb51';
    const GOLD_DARK = '#92702d';
    const OLIVE = '#223c2f';
    const names = Object.freeze({
        soldado: 'Soldado do efetivo profissional: uma divisa',
        cabo: 'Cabo: duas divisas',
        'terceiro-sargento': 'Terceiro-sargento: três divisas',
        'segundo-sargento': 'Segundo-sargento: três divisas, separador prateado e uma divisa',
        'primeiro-sargento': 'Primeiro-sargento: três divisas, separador prateado e duas divisas',
        subtenente: 'Subtenente: losango dourado vazado',
        aspirante: 'Aspirante a oficial: estrela singela prateada',
        'segundo-tenente': 'Segundo-tenente: uma estrela com Cruzeiro do Sul',
        'primeiro-tenente': 'Primeiro-tenente: duas estrelas com Cruzeiro do Sul',
        capitao: 'Capitão: três estrelas com Cruzeiro do Sul',
        major: 'Major: uma estrela raiada e duas estrelas simples com Cruzeiro do Sul',
        'tenente-coronel': 'Tenente-coronel: duas estrelas raiadas e uma simples com Cruzeiro do Sul',
        coronel: 'Coronel: três estrelas raiadas com Cruzeiro do Sul',
        'general-brigada': 'General de brigada: símbolo do Exército e duas estrelas em faixa',
        'general-divisao': 'General de divisão: símbolo do Exército e três estrelas em triângulo',
        'general-exercito': 'General de exército: símbolo do Exército e quatro estrelas em retângulo',
        marechal: 'Marechal: símbolo do Exército e cinco estrelas em sautor'
    });

    function point(x, y) { return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`; }

    function vertices(x, y, outer, inner, count) {
        return Array.from({ length: count * 2 }, (_, i) => {
            const angle = -Math.PI / 2 + i * Math.PI / count;
            const radius = i % 2 ? inner : outer;
            return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
        });
    }

    function star(x, y, size, detailed = true) {
        const pts = vertices(x, y, size, size * 0.405, 5);
        let markup = `<polygon points="${pts.map(p => point(...p)).join(' ')}" fill="${SILVER}" stroke="${SILVER_DARK}" stroke-width="0.65" stroke-linejoin="round"/>`;
        if (detailed) {
            for (let i = 0; i < 10; i++) {
                markup += `<path d="M${point(x, y)} L${point(...pts[i])} L${point(...pts[(i + 1) % 10])}Z" fill="${i % 2 ? SILVER_DARK : SILVER_LIGHT}" opacity="${i % 2 ? '.48' : '.65'}"/>`;
            }
        }
        return markup;
    }

    function southernCross(x, y, scale) {
        // Top, left, right, small Epsilon and bottom: five stars, never dots.
        return [[0, -3.5, 1], [-2.4, -0.8, 0.9], [2.4, -1.2, 0.9], [1.6, 1.4, 0.65], [0, 3.3, 1.05]]
            .map(([dx, dy, r]) => star(x + dx * scale, y + dy * scale, r * scale, false)).join('');
    }

    function officerStar(x, y, size, radiated = false) {
        let markup = '';
        if (radiated) {
            const rays = vertices(x, y, size, size * 0.64, 15);
            markup += `<polygon points="${rays.map(p => point(...p)).join(' ')}" fill="${GOLD}" stroke="${GOLD_DARK}" stroke-width=".65"/>`;
            for (let i = 0; i < 30; i += 2) {
                markup += `<path d="M${point(x, y)} L${point(...rays[i])} L${point(...rays[(i + 1) % 30])}Z" fill="${GOLD_DARK}" opacity=".68"/>`;
            }
        }
        markup += star(x, y, radiated ? size * 0.81 : size);
        const r = size * 0.37;
        markup += `<circle cx="${x}" cy="${y}" r="${r}" fill="#12689b" stroke="${SILVER_LIGHT}" stroke-width=".55"/>`;
        markup += `<circle cx="${x}" cy="${y}" r="${r * .65}" fill="#084b79" stroke="${SILVER}" stroke-width=".3"/>`;
        // Tiny circular crown around the constellation, as on metal devices.
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            markup += star(x + Math.cos(angle) * r * .83, y + Math.sin(angle) * r * .83, r * .065, false);
        }
        markup += southernCross(x, y, r * .14);
        return markup;
    }

    function chevrons(count) {
        const rows = count > 3 ? count + 1 : count;
        const firstY = 44 - (20 + (rows - 1) * 9) / 2;
        const lastY = firstY + 20 + (rows - 1) * 9;
        let markup = `<path d="M9 ${firstY + 13} L32 ${firstY - 5} L55 ${firstY + 13} V${lastY + 4} Q32 ${lastY + 13} 9 ${lastY + 4}Z" fill="${OLIVE}" stroke="#77846b" stroke-width="1"/>`;
        for (let i = 0; i < rows; i++) {
            const y = firstY + i * 9;
            const separator = count > 3 && i === 3;
            markup += `<path class="${separator ? 'insignia-chevron-divider' : 'insignia-chevron'}" d="M13 ${y + 14} L32 ${y} L51 ${y + 14} V${y + 20} L32 ${y + 6} L13 ${y + 20}Z" fill="${separator ? SILVER_LIGHT : '#aeb8b0'}" stroke="${separator ? '#d5dde0' : '#6e7b71'}" stroke-width=".5"/>`;
            if (!separator) markup += `<path d="M14 ${y + 14} L32 ${y + 1} L50 ${y + 14}" fill="none" stroke="#dde3dc" stroke-width=".75"/>`;
        }
        return markup;
    }

    function armyEmblem() {
        const x = 32, y = 29;
        let markup = '<g class="insignia-army-emblem">';
        // The vertical sword and twenty radiating sword blades frame the oval.
        markup += `<path d="M32 3 L34.3 10 L34.3 53 L29.7 53 L29.7 10Z" fill="${SILVER}" stroke="${SILVER_DARK}" stroke-width=".7"/>`;
        markup += `<path d="M28 49 H36 V51 H28Z M30 51 H34 V57 Q32 59 30 57Z" fill="${SILVER}" stroke="${SILVER_DARK}" stroke-width=".7"/>`;
        markup += '<path d="M30 53 H34 M30 55 H34" stroke="#73858a" stroke-width=".8"/>';
        for (let i = 0; i < 20; i++) {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 20;
            const half = Math.PI / 20;
            const tip = [x + Math.cos(a) * 20, y + Math.sin(a) * 25];
            const left = [x + Math.cos(a - half) * 14.5, y + Math.sin(a - half) * 19];
            const right = [x + Math.cos(a + half) * 14.5, y + Math.sin(a + half) * 19];
            markup += `<path d="M${point(...left)} L${point(...tip)} L${point(...right)} L${point(x, y)}Z" fill="${SILVER}" stroke="${SILVER_DARK}" stroke-width=".6"/>`;
            markup += `<path d="M${point(x, y)} L${point(...tip)} L${point(...right)}Z" fill="${SILVER_DARK}" opacity=".5"/>`;
        }
        markup += `<ellipse cx="32" cy="29" rx="14.1" ry="20" fill="#078253" stroke="${SILVER_LIGHT}" stroke-width=".7"/>`;
        markup += '<ellipse cx="32" cy="29" rx="10.3" ry="16.4" fill="#f4d33e"/>';
        markup += '<ellipse cx="32" cy="29" rx="7.1" ry="12.5" fill="#12649a"/>';
        markup += southernCross(32, 29, 2.45);
        return markup + '</g>';
    }

    function general(count) {
        const arrangement = {
            2: [[21, 74], [43, 74]],
            3: [[32, 65], [20, 79], [44, 79]],
            4: [[21, 64], [43, 64], [21, 80], [43, 80]],
            5: [[19, 62], [45, 62], [32, 72], [19, 82], [45, 82]]
        };
        return armyEmblem() + `<g class="insignia-rank-stars" data-star-count="${count}">` +
            arrangement[count].map(([x, y]) => star(x, y, count === 5 ? 6.1 : 6.9)).join('') + '</g>';
    }

    function render(tema) {
        if (!Object.prototype.hasOwnProperty.call(names, tema)) return '';
        let device = '';
        if (tema === 'soldado') device = chevrons(1);
        else if (tema === 'cabo') device = chevrons(2);
        else if (tema === 'terceiro-sargento') device = chevrons(3);
        else if (tema === 'segundo-sargento') device = chevrons(4);
        else if (tema === 'primeiro-sargento') device = chevrons(5);
        else if (tema === 'subtenente') {
            device = `<path d="M32 15 L46 44 L32 73 L18 44Z M32 26 L23.5 44 L32 62 L40.5 44Z" fill="${GOLD}" fill-rule="evenodd" stroke="${GOLD_DARK}" stroke-width=".75"/>`;
            device += '<path d="M32 17 L44.5 44 L32 70" fill="none" stroke="#ffe9a0" stroke-width="1.1"/>';
        } else if (tema === 'aspirante') device = star(32, 45, 23);
        else if (tema === 'segundo-tenente') device = officerStar(32, 45, 23);
        else if (tema === 'primeiro-tenente') device = officerStar(32, 26, 18) + officerStar(32, 63, 18);
        else if (['capitao', 'major', 'tenente-coronel', 'coronel'].includes(tema)) {
            const radiated = { capitao: 0, major: 1, 'tenente-coronel': 2, coronel: 3 }[tema];
            // On a vertical shoulder board the radiated devices sit at the base.
            device = [16, 44, 72].map((y, i) => officerStar(32, y, 13, i >= 3 - radiated)).join('');
        } else {
            device = general({ 'general-brigada': 2, 'general-divisao': 3, 'general-exercito': 4, marechal: 5 }[tema]);
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" class="military-insignia military-insignia--${tema}" viewBox="0 0 64 92" width="64" height="92" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${names[tema]}" focusable="false"><title>${names[tema]}</title>${device}</svg>`;
    }

    window.KingMilitaryInsignia = Object.freeze({ render });
})();
