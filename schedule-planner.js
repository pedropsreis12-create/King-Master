/* Planejador estrito: a IA interpreta preferências; horários e validação são determinísticos. */
(() => {
    const Core = window.KingScheduleCore;
    if (!Core) return;
    const DAY_NAMES = { 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado', 7: 'domingo' };
    const clock = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const asInt = (value, fallback, min, max) => Number.isInteger(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
    const format = minutes => Core.toClock(minutes);

    const ScheduleConstraints = {
        normalize(input = {}) {
            const base = Core.normalizeSettings(input);
            const start = Core.toMinutes(base.startTime);
            const end = clock(input.endTime) && Core.toMinutes(input.endTime) > start
                ? Core.toMinutes(input.endTime) : Math.min(1439, start + base.dailyCapacityMinutes);
            const registrationMinutes = asInt(input.registrationMinutes, base.closingMinutes, 0, 30);
            const naturalBlocks = Math.max(1, Math.floor((end - start + base.pauseMinutes) / (base.blockMinutes + registrationMinutes + base.pauseMinutes)));
            return {
                ...base,
                endTime: format(end),
                blocksPerDay: asInt(input.blocksPerDay, naturalBlocks, 1, 8),
                registrationMinutes,
                studyDays: base.studyDays.filter(day => day >= 1 && day <= 7)
            };
        },
        requiredMinutes(input) {
            const value = this.normalize(input);
            return value.blocksPerDay * (value.blockMinutes + value.registrationMinutes) + (value.blocksPerDay - 1) * value.pauseMinutes;
        },
        slots(input, busyByDay = {}) {
            const value = this.normalize(input);
            const required = this.requiredMinutes(value);
            const errors = [];
            const slots = [];
            const beginning = Core.toMinutes(value.startTime), limit = Core.toMinutes(value.endTime);
            if (limit <= beginning) errors.push('O horário de término precisa ser posterior ao início.');
            for (const day of value.studyDays) {
                const available = limit - beginning;
                if (required > available) {
                    errors.push(`Em ${DAY_NAMES[day]}, ${value.blocksPerDay} blocos precisam de ${required} min, mas há apenas ${available} min entre ${value.startTime} e ${value.endTime}. Ajuste uma regra antes de gerar.`);
                    continue;
                }
                const ranges = (value.availability[day] || []).filter(range => clock(range.start) && clock(range.end))
                    .map(range => ({ start: Math.max(beginning, Core.toMinutes(range.start)), end: Math.min(limit, Core.toMinutes(range.end)) }))
                    .filter(range => range.end > range.start).sort((a, b) => a.start - b.start);
                const busy = (Array.isArray(busyByDay[day]) ? busyByDay[day] : []).filter(range => clock(range.start) && clock(range.end))
                    .map(range => ({ start: Core.toMinutes(range.start), end: Core.toMinutes(range.end) }))
                    .filter(range => range.end > range.start).sort((a, b) => a.start - b.start);
                let cursor = beginning;
                let failed = false;
                for (let order = 0; order < value.blocksPerDay; order++) {
                    if (order) cursor += value.pauseMinutes;
                    const span = value.blockMinutes + value.registrationMinutes;
                    let chosen = null;
                    for (const range of ranges) {
                        let candidate = Math.max(cursor, range.start);
                        while (candidate + span <= range.end) {
                            const collision = busy.find(item => candidate < item.end && candidate + span > item.start);
                            if (!collision) { chosen = candidate; break; }
                            candidate = Math.max(candidate + 1, collision.end);
                        }
                        if (chosen !== null) break;
                    }
                    if (chosen === null) {
                        errors.push(`Em ${DAY_NAMES[day]}, o bloco ${order + 1} não cabe nos horários livres até ${value.endTime}${busy.length ? ' por causa de compromissos da Agenda' : ''}. Nenhum horário foi ampliado automaticamente.`);
                        failed = true;
                        break;
                    }
                    slots.push({ day, order, start: format(chosen), end: format(chosen + value.blockMinutes), duration: value.blockMinutes,
                        registrationEnd: format(chosen + span) });
                    cursor = chosen + span;
                }
                if (failed) continue;
            }
            return { constraints: value, slots, errors, requiredMinutes: required };
        }
    };

    const UserStudyPreferences = {
        normalize(subjects = [], settings = {}) {
            return {
                maxSubjectsPerDay: asInt(settings.maxSubjectsPerDay, 2, 1, 8),
                subjects: (Array.isArray(subjects) ? subjects : []).filter(item => item && item.subject && Number(item.schedule?.weeklyBlocks) > 0)
                    .map(item => ({ id: String(item.id), name: String(item.subject).trim(), weeklyBlocks: asInt(item.schedule.weeklyBlocks, 1, 1, 30),
                        priority: asInt(item.schedule.priority, 2, 1, 3), difficulty: asInt(item.schedule.difficulty, 2, 1, 3),
                        contentLoad: asInt(item.schedule.contentLoad, 2, 1, 3), consecutive: Boolean(item.schedule.consecutive),
                        preferredDay: asInt(item.schedule.preferredDay, 0, 0, 7) }))
            };
        }
    };

    const AIScheduleAssistant = {
        interpret(raw = {}, message = '', constraintsInput = {}, subjectPlans = []) {
            const constraints = ScheduleConstraints.normalize(constraintsInput);
            const errors = [], warnings = [];
            const plans = new Map(subjectPlans.map(item => [key(item.name), item]));
            const resolve = name => plans.get(key(name));
            const explicitBlocks = String(message).match(/\b(\d{1,2})\s+blocos?\b/i) || String(message).match(/\bblocos?\s*(?:de\s*)?(\d{1,2})\b/i);
            const requestedBlocks = Number(raw.requestedBlocksPerDay || 0);
            const writtenBlocks = Number(explicitBlocks?.[1] || 0);
            for (const count of new Set([requestedBlocks, writtenBlocks])) if (count && count !== constraints.blocksPerDay)
                errors.push(`Você pediu ${count} blocos, mas a regra salva exige ${constraints.blocksPerDay} por dia. Altere a configuração se quiser mudar esse limite.`);
            const requestedEnd = String(raw.requestedEndTime || '').trim();
            const writtenEnd = String(message).match(/(?:at[eé]|ate|até|terminar|encerrar|finalizar)\s*(?:as|às)?\s*(\d{1,2}:[0-5]\d|\d{1,2}h(?:[0-5]\d)?)/i)?.[1]
                ?.toLowerCase().replace('h', ':').replace(/:$/, ':00').padStart(5, '0');
            for (const end of new Set([requestedEnd, writtenEnd])) if (end && end !== constraints.endTime)
                errors.push(`Você pediu término às ${end}, mas o limite salvo é ${constraints.endTime}. Altere o horário estruturado antes de gerar.`);
            const priorityIds = [...new Set((Array.isArray(raw.prioritySubjects) ? raw.prioritySubjects : []).map(resolve).filter(Boolean).map(item => item.id))];
            const preferredDays = {};
            for (const entry of (Array.isArray(raw.preferredDays) ? raw.preferredDays : [])) {
                const plan = resolve(entry?.subject), day = Number(entry?.day);
                if (!plan || !Number.isInteger(day) || day < 1 || day > 7) continue;
                if (!constraints.studyDays.includes(day)) errors.push(`${plan.name} foi pedido para ${DAY_NAMES[day]}, mas esse dia está desativado.`);
                else if (plan.preferredDay && plan.preferredDay !== day) errors.push(`${plan.name} já tem outro dia fixado nas configurações.`);
                else preferredDays[plan.id] = day;
            }
            const avoidSameDay = [];
            for (const entry of (Array.isArray(raw.avoidSameDay) ? raw.avoidSameDay : [])) {
                const first = resolve(entry?.first), second = resolve(entry?.second);
                if (first && second && first.id !== second.id) avoidSameDay.push([first.id, second.id]);
            }
            if (String(message).trim() && !priorityIds.length && !Object.keys(preferredDays).length && !avoidSameDay.length && !errors.length)
                warnings.push('A mensagem não trouxe uma preferência aplicável; o plano seguirá as regras salvas.');
            return { priorityIds, preferredDays, avoidSameDay, errors, warnings, explanation: String(raw.explanation || '').slice(0, 350) };
        }
    };

    const ScheduleValidator = {
        validate(schedule, constraintsInput, subjectsInput, options = {}) {
            const plan = ScheduleConstraints.slots(constraintsInput, options.busyByDay || {});
            const preferences = UserStudyPreferences.normalize(subjectsInput, plan.constraints);
            const errors = [...plan.errors], warnings = [];
            const blocks = Array.isArray(schedule?.blocks) ? schedule.blocks : [];
            const slots = new Map(plan.slots.map(slot => [`${slot.day}-${slot.order}`, slot]));
            const subjectIds = new Set(preferences.subjects.map(item => item.id));
            const seen = new Set();
            if (blocks.length !== plan.slots.length) errors.push(`Esperados ${plan.slots.length} blocos; o plano tem ${blocks.length}.`);
            for (const block of blocks) {
                const id = `${block.day}-${block.order}`;
                const slot = slots.get(id);
                if (seen.has(id)) errors.push(`O bloco ${id} aparece mais de uma vez.`);
                seen.add(id);
                if (!slot) { errors.push(`Bloco fora de um dia ou posição disponível: ${id}.`); continue; }
                if (block.start !== slot.start || Number(block.duration) !== slot.duration || (block.end && block.end !== slot.end))
                    errors.push(`O bloco ${Number(block.order) + 1} de ${DAY_NAMES[block.day]} não respeita o horário ${slot.start}–${slot.end}.`);
                if (!subjectIds.has(String(block.subjectId))) errors.push(`O bloco ${id} usa uma matéria não selecionada.`);
            }
            for (const id of slots.keys()) if (!seen.has(id)) errors.push(`Falta o bloco ${id}.`);
            const intent = options.intent || {};
            for (const day of plan.constraints.studyDays) {
                const dayBlocks = blocks.filter(block => Number(block.day) === day);
                const names = new Set(dayBlocks.map(block => String(block.subjectId)));
                if (dayBlocks.length !== plan.constraints.blocksPerDay) errors.push(`${DAY_NAMES[day]} precisa ter exatamente ${plan.constraints.blocksPerDay} blocos.`);
                if (names.size > preferences.maxSubjectsPerDay) warnings.push(`${DAY_NAMES[day]} tem ${names.size} matérias; sua preferência é até ${preferences.maxSubjectsPerDay}.`);
                for (const [first, second] of (intent.avoidSameDay || [])) if (names.has(first) && names.has(second))
                    errors.push(`${DAY_NAMES[day]} reúne duas matérias que você pediu para separar.`);
            }
            for (const subject of preferences.subjects) {
                const assigned = blocks.filter(block => String(block.subjectId) === subject.id);
                const fixedDay = intent.preferredDays?.[subject.id] || subject.preferredDay;
                if (!assigned.length) errors.push(`${subject.name} ficou sem bloco, embora esteja incluída na carga semanal.`);
                if (fixedDay && assigned.some(block => Number(block.day) !== fixedDay)) errors.push(`${subject.name} deve ficar somente em ${DAY_NAMES[fixedDay]}.`);
                if (assigned.length !== subject.weeklyBlocks) warnings.push(`${subject.name}: ${assigned.length} blocos no plano, ${subject.weeklyBlocks} desejados.`);
                if (subject.consecutive && assigned.length >= 2) {
                    const hasPair = assigned.some(block => assigned.some(other => other !== block && other.day === block.day && Math.abs(other.order - block.order) === 1));
                    if (!hasPair) warnings.push(`${subject.name} foi marcada para pares, mas não recebeu dois blocos juntos.`);
                }
            }
            for (const reserved of (options.reservedBlocks || [])) {
                const preserved = blocks.find(block => String(block.id) === String(reserved.id));
                if (!preserved || preserved.subjectId !== reserved.subjectId || preserved.start !== reserved.start || preserved.status !== reserved.status)
                    errors.push('Um bloco já concluído seria alterado. Gere novamente sem mexer no histórico.');
            }
            return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)], constraints: plan.constraints };
        }
    };

    const ScheduleGenerator = {
        generate(subjectsInput, constraintsInput, weekKey, options = {}) {
            const plan = ScheduleConstraints.slots(constraintsInput, options.busyByDay || {});
            const preferences = UserStudyPreferences.normalize(subjectsInput, plan.constraints);
            const intent = options.intent || {};
            const errors = [...plan.errors, ...(intent.errors || [])];
            if (!preferences.subjects.length) errors.push('Defina pelo menos uma matéria com blocos por semana.');
            if (preferences.subjects.length > plan.slots.length) errors.push(`Há ${preferences.subjects.length} matérias para ${plan.slots.length} blocos; cada matéria selecionada precisa aparecer ao menos uma vez.`);
            if (errors.length) return { valid: false, errors, warnings: [], blocks: [], constraints: plan.constraints };
            const previous = Array.isArray(options.reservedBlocks) ? options.reservedBlocks : [];
            const blocks = plan.slots.map(slot => ({ ...slot, id: `plano-${weekKey}-${slot.day}-${slot.order}`, subjectId: '', kind: 'teoria', topic: '', status: 'pending', registered: false }));
            for (const reserved of previous) {
                const slot = blocks.find(block => block.day === Number(reserved.day) && block.start === reserved.start && block.duration === Number(reserved.duration));
                if (!slot || slot.subjectId) { errors.push('Um bloco concluído não coincide com os horários configurados. Ajuste as regras ou planeje outra semana.'); continue; }
                Object.assign(slot, reserved, { order: slot.order, end: slot.end, registrationEnd: slot.registrationEnd });
            }
            if (errors.length) return { valid: false, errors, warnings: [], blocks: [], constraints: plan.constraints };
            const counts = new Map(preferences.subjects.map(item => [item.id, 0]));
            const weekTimestamp = Core.fromIso(weekKey).getTime();
            blocks.filter(block => block.subjectId).forEach(block => counts.set(String(block.subjectId), (counts.get(String(block.subjectId)) || 0) + 1));
            const assignedDays = new Map(preferences.subjects.map(item => [item.id, new Set(blocks.filter(block => String(block.subjectId) === item.id).map(block => Number(block.day)))]));
            for (const block of blocks) {
                if (block.subjectId) continue;
                const dayBlocks = blocks.filter(item => item.day === block.day && item.order < block.order && item.subjectId);
                const daySubjects = new Set(dayBlocks.map(item => String(item.subjectId)));
                const previousBlock = dayBlocks.at(-1);
                let runLength = 0;
                for (const item of [...dayBlocks].reverse()) {
                    if (item.subjectId !== previousBlock?.subjectId) break;
                    runLength++;
                }
                const unfilled = blocks.filter(item => !item.subjectId).length;
                const neverUsed = preferences.subjects.filter(item => !counts.get(item.id));
                const candidates = preferences.subjects.filter(item => {
                    const fixedDay = intent.preferredDays?.[item.id] || item.preferredDay;
                    if (fixedDay && fixedDay !== block.day) return false;
                    if (unfilled <= neverUsed.length && counts.get(item.id)) return false;
                    return !(intent.avoidSameDay || []).some(([first, second]) =>
                        (item.id === first && daySubjects.has(second)) || (item.id === second && daySubjects.has(first)));
                }).map(item => {
                    const used = counts.get(item.id) || 0;
                    const deficit = item.weeklyBlocks - used;
                    const sameDay = daySubjects.has(item.id);
                    const sameAsPrevious = previousBlock && String(previousBlock.subjectId) === item.id;
                    const consecutivePenalty = sameAsPrevious && runLength >= 2 ? -100 : 0;
                    const lastStudy = Number(options.lastStudiedBySubject?.[item.id]) || 0;
                    const daysSinceStudy = lastStudy > 0 ? Math.max(0, Math.min(21, Math.floor((weekTimestamp - lastStudy) / 86400000))) : 21;
                    const score = (used === 0 ? 70 : 0) + Math.max(-3, deficit) * 20 + item.priority * 7 + item.difficulty * 2 + item.contentLoad
                        + daysSinceStudy * .4
                        + (intent.priorityIds || []).includes(item.id) * 18 + (sameDay ? 24 : daySubjects.size >= preferences.maxSubjectsPerDay ? -140 : 0)
                        + (sameAsPrevious ? (item.consecutive && used < item.weeklyBlocks && runLength < 2 ? 120 : 5) : 0) + consecutivePenalty
                        - (assignedDays.get(item.id)?.has(block.day - 1) ? 9 : 0)
                        + (intent.preferredDays?.[item.id] === block.day ? 35 : 0);
                    return { item, score };
                }).sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'pt-BR'));
                const chosen = candidates[0]?.item;
                if (!chosen) { errors.push(`Não há matéria possível para o bloco ${block.order + 1} de ${DAY_NAMES[block.day]} sem violar as preferências.`); break; }
                block.subjectId = chosen.id;
                block.kind = previousBlock?.subjectId === chosen.id ? 'questoes' : 'teoria';
                counts.set(chosen.id, (counts.get(chosen.id) || 0) + 1);
                assignedDays.get(chosen.id).add(block.day);
            }
            const generated = { key: Core.monday(weekKey), blocks, dailyClosures: {}, warnings: [], generatedAt: Date.now() };
            const check = ScheduleValidator.validate(generated, plan.constraints, subjectsInput, options);
            return { ...generated, valid: !errors.length && check.valid, errors: [...errors, ...check.errors], warnings: [...(intent.warnings || []), ...check.warnings], constraints: plan.constraints };
        }
    };

    window.KingSchedulePlanner = { ScheduleConstraints, UserStudyPreferences, AIScheduleAssistant, ScheduleGenerator, ScheduleValidator };
})();
