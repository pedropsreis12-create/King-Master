/* Cenários acompanham a moldura equipada, nunca o XP ou a liga por conta própria. */
(() => {
    const scenes = {
        genin: { chapter: 'KONOHA', name: 'O primeiro passo', motif: '忍', effect: 'leaves', power: 1, art: 'genin' },
        chunin: { chapter: 'EXAME CHUNIN', name: 'Estratégia em movimento', motif: '中', effect: 'seals', power: 2, art: 'chunin' },
        oni: { chapter: 'CORPORAÇÃO DOS CAÇADORES', name: 'Respiração da água', motif: '滅', effect: 'tides', power: 3, art: 'oni' },
        gear2: { chapter: 'ENIES LOBBY', name: 'O pulso da determinação', motif: 'Ⅱ', effect: 'steam', power: 4, art: 'gear2' },
        kaioken: { chapter: 'TÉCNICA DO SENHOR KAIOH', name: 'Além do próprio limite', motif: '界', effect: 'crimson', power: 5, art: 'kaioken' },
        saiyajin: { chapter: 'NAMEKUSEI', name: 'O despertar da lenda', motif: '超', effect: 'ki', power: 6, art: 'namek' },
        bankai: { chapter: 'SOUL SOCIETY', name: 'Liberação final', motif: '斬', effect: 'petals', power: 7, art: 'bankai' },
        dominio: { chapter: 'VAZIO ILIMITADO', name: 'Tudo converge para o infinito', motif: '領', effect: 'void', power: 8, art: 'void' },
        sabio: { chapter: 'MONTE MYŌBOKU', name: 'A energia da natureza', motif: '仙', effect: 'sage', power: 9, art: 'sage' },
        portoes: { chapter: 'OITAVO PORTÃO · MORTE', name: 'A juventude não tem limites', motif: '八', effect: 'gates', power: 10, art: 'gates' },
        gear5: { chapter: 'NIKA · GUERREIRO DA LIBERTAÇÃO', name: 'Tambores da libertação', motif: '☀', effect: 'nika', power: 11, art: 'gear5' },
        monarca: { chapter: 'EXÉRCITO DAS SOMBRAS', name: 'Erga-se', motif: '♛', effect: 'shadows', power: 12, art: 'shadow' },
        instinto: { chapter: 'TORNEIO DO PODER', name: 'O corpo se move sozinho', motif: '身', effect: 'instinct', power: 13, art: 'instinct' },
        tita: { chapter: 'A COORDENADA · CAMINHOS', name: 'Todas as memórias se encontram', motif: '巨', effect: 'paths', power: 14, art: 'paths' },
        destruicao: { chapter: 'HAKAI', name: 'O equilíbrio da destruição', motif: '破', effect: 'hakai', power: 15, art: 'hakai' },
        'haki-rei': { chapter: 'VONTADE DO CONQUISTADOR', name: 'O céu se divide', motif: '覇', effect: 'conqueror', power: 16, art: 'conqueror' },
        entidade: { chapter: 'ENTIDADE ABSOLUTA', name: 'O conhecimento transcende tudo', motif: '∞', effect: 'infinity', power: 17, art: 'cosmos' }
    };
    function particle(index) {
        return `<i style="--n:${index};--x:${(index * 37 + 7) % 98}%;--y:${(index * 53 + 9) % 94}%;--delay:-${(index * .71).toFixed(2)}s"></i>`;
    }
    function render(hero, rank, mode) {
        if (!hero || !rank) return;
        const key = `${mode}:${rank.tema}`;
        if (hero.dataset.artKey === key) return;
        hero.dataset.artKey = key;
        hero.querySelector('.rank-world')?.remove();
        hero.querySelector('.rank-scene-heading')?.remove();
        hero.querySelector('.avatar-energy')?.remove();
        hero.dataset.artMode = mode;
        const scene = mode === 'aura' ? scenes[rank.tema] : null;
        const power = scene?.power || Math.min(17, Math.ceil(rank.nivel / 4));
        hero.dataset.artPower = power < 4 ? 'starter' : power < 8 ? 'rising' : power < 12 ? 'elite' : power < 16 ? 'legend' : 'absolute';
        hero.style.setProperty('--scene-power', power);
        const world = document.createElement('div');
        world.className = `rank-world world-${scene?.effect || 'military'}`;
        world.setAttribute('aria-hidden', 'true');
        if (scene?.art) {
            world.classList.add('has-scenery');
            const source = `assets/rank-${scene.art}.webp`;
            world.innerHTML = `<img class="rank-landscape" src="${source}" alt="" decoding="async" draggable="false"><img class="rank-landscape rank-landscape-wing landscape-left" src="${source}" alt="" decoding="async" draggable="false"><img class="rank-landscape rank-landscape-wing landscape-right" src="${source}" alt="" decoding="async" draggable="false">`;
        }
        world.innerHTML += `<div class="rank-world-shade"></div><div class="rank-world-orbit orbit-a"></div><div class="rank-world-orbit orbit-b"></div><div class="rank-world-orbit orbit-c"></div><div class="rank-world-particles">${Array.from({length: 4 + power * 2}, (_, i) => particle(i)).join('')}</div>`;
        if (scene) {
            world.innerHTML += `<span class="rank-world-glyph glyph-left">${scene.motif}</span><span class="rank-world-glyph glyph-right">${scene.motif}</span>`;
            const heading = document.createElement('div');
            heading.className = 'rank-scene-heading';
            heading.innerHTML = `<small>${scene.chapter}</small><span>${scene.name}</span>`;
            hero.prepend(heading);
        } else {
            world.innerHTML += '<div class="military-coordinate coord-left">BRASIL<br>ORDEM · DISCIPLINA</div><div class="military-coordinate coord-right">MISSÃO<br>HONRA · CONSTÂNCIA</div><div class="military-ribbon"></div>';
        }
        hero.prepend(world);
        const energy = document.createElement('div');
        energy.className = `avatar-energy energy-${scene?.effect || 'military'}`;
        energy.setAttribute('aria-hidden', 'true');
        energy.innerHTML = Array.from({length: scene ? Math.min(24, power + 5) : 4}, (_, i) => `<i style="--n:${i};--ray:${i * 360 / (scene ? Math.min(24, power + 5) : 4)}deg;--delay:-${i * .17}s"></i>`).join('');
        hero.querySelector('.avatar-stage')?.prepend(energy);
    }
    window.KingRankArt = { render };
})();
