/* Planejador determinístico: disponibilidade é limite; blocos por dia são meta. */
(() => {
    const Core = window.KingScheduleCore;
    if (!Core) return;

    const DAY_NAMES = { 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado', 7: 'domingo' };
    const clock = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const integer = (value, fallback, min, max) => Number.isInteger(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
    const format = minutes => Core.toClock(minutes);
    const total = ranges => ranges.reduce((sum, range) => sum + range.end - range.start, 0);
    const unique = values => [...new Set(values)];
    const validDay = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 7;

    function mergeRanges(ranges) {
        const merged = [];
        ranges.filter(range => range.end > range.start).sort((a, b) => a.start - b.start || a.end - b.end).forEach(range => {
            if (merged.length && range.start <= merged.at(-1).end) merged.at(-1).end = Math.max(merged.at(-1).end, range.end);
            else merged.push({ ...range });
        });
        return merged;
    }

    function subtractRanges(available, busy) {
        const result = [];
        for (const range of available) {
            let cursor = range.start;
            for (const item of busy) {
                if (item.end <= cursor || item.start >= range.end) continue;
                if (item.start > cursor) result.push({ start: cursor, end: Math.min(item.start, range.end) });
                cursor = Math.max(cursor, item.end);
                if (cursor >= range.end) break;
            }
            if (cursor < range.end) result.push({ start: cursor, end: range.end });
        }
        return result;
    }

    function place(ranges, durations, pauses, registrationMinutes) {
        const slots = [];
        let registrationEnd = -1440;
        for (let order = 0; order < durations.length; order++) {
            const span = durations[order] + registrationMinutes;
            const earliest = registrationEnd + (order ? pauses[order - 1] : 0);
            const range = ranges.find(item => Math.max(item.start, earliest) + span <= item.end);
            if (!range) return null;
            const start = Math.max(range.start, earliest);
            registrationEnd = start + span;
            slots.push({ order, start: format(start), end: format(start + durations[order]), duration: durations[order],
                registrationEnd: format(registrationEnd), pauseBefore: order ? start - Core.toMinutes(slots[order - 1].registrationEnd) : 0 });
        }
        return slots;
    }

    function pack(ranges, count, constraints) {
        if (!count) return [];
        const minimumDuration = constraints.durationMode === 'flexible' ? constraints.minBlockMinutes : constraints.blockMinutes;
        const desiredDuration = constraints.durationMode === 'flexible' && constraints.mode === 'free'
            ? constraints.maxBlockMinutes : constraints.blockMinutes;
        const minimumPause = constraints.pauseMode === 'flexible' ? constraints.minPauseMinutes : constraints.pauseMinutes;
        const durations = Array(count).fill(minimumDuration);
        const pauses = Array(Math.max(0, count - 1)).fill(minimumPause);
        if (!place(ranges, durations, pauses, constraints.registrationMinutes)) return null;

        // Preserve as much study time as possible, then restore preferred pauses.
        for (let index = 0; index < count; index++) {
            let low = durations[index], high = desiredDuration;
            while (low < high) {
                const candidate = Math.ceil((low + high) / 2);
                durations[index] = candidate;
                if (place(ranges, durations, pauses, constraints.registrationMinutes)) low = candidate;
                else high = candidate - 1;
            }
            durations[index] = low;
        }
        for (let index = 0; index < pauses.length; index++) {
            let low = pauses[index], high = constraints.pauseMinutes;
            while (low < high) {
                const candidate = Math.ceil((low + high) / 2);
                pauses[index] = candidate;
                if (place(ranges, durations, pauses, constraints.registrationMinutes)) low = candidate;
                else high = candidate - 1;
            }
            pauses[index] = low;
        }
        return place(ranges, durations, pauses, constraints.registrationMinutes);
    }

    const ScheduleConstraints = {
        normalize(input = {}) {
            const base = Core.normalizeSettings(input);
            const targetBlocksPerDay = integer(input.targetBlocksPerDay ?? input.blocksPerDay, base.targetBlocksPerDay || base.blocksPerDay, 1, 8);
            return { ...base, mode: ['adaptive', 'rigid', 'free'].includes(input.mode) ? input.mode : base.mode || 'adaptive',
                targetBlocksPerDay, blocksPerDay: targetBlocksPerDay,
                pauseMode: input.pauseMode === 'flexible' ? 'flexible' : base.pauseMode || 'fixed',
                minPauseMinutes: base.minPauseMinutes, durationMode: input.durationMode === 'flexible' ? 'flexible' : base.durationMode || 'fixed',
                minBlockMinutes: base.minBlockMinutes, maxBlockMinutes: base.maxBlockMinutes,
                allowExtraBlocks: input.allowExtraBlocks === true, studyDays: base.studyDays.filter(validDay) };
        },
        requiredMinutes(input, count) {
            const value = this.normalize(input);
            const blocks = integer(count, value.targetBlocksPerDay, 1, 8);
            return blocks * (value.blockMinutes + value.registrationMinutes)
                + (blocks - 1) * value.pauseMinutes;
        },
        freeRanges(day, constraints, busyByDay = {}, intent = {}) {
            const saved = mergeRanges((constraints.availability[day] || []).filter(range => clock(range.start) && clock(range.end))
                .map(range => ({ start: Core.toMinutes(range.start), end: Core.toMinutes(range.end) })));
            const override = (intent.dayOverrides || []).find(item => Number(item.day) === day) || {};
            const temporary = intent.temporaryAvailability?.[day];
            let ranges = saved;
            if (Array.isArray(temporary)) {
                const requested = mergeRanges(temporary.filter(range => clock(range.start) && clock(range.end))
                    .map(range => ({ start: Core.toMinutes(range.start), end: Core.toMinutes(range.end) })));
                ranges = mergeRanges(saved.flatMap(range => requested.map(item => ({ start: Math.max(range.start, item.start), end: Math.min(range.end, item.end) }))));
            }
            if (clock(override.startTime) || clock(override.endTime)) {
                const start = clock(override.startTime) ? Core.toMinutes(override.startTime) : 0;
                const end = clock(override.endTime) ? Core.toMinutes(override.endTime) : 1440;
                ranges = ranges.map(range => ({ start: Math.max(range.start, start), end: Math.min(range.end, end) }))
                    .filter(range => range.end > range.start);
            }
            if (clock(intent.targetEndTime)) {
                const end = Core.toMinutes(intent.targetEndTime);
                ranges = ranges.map(range => ({ start: range.start, end: Math.min(range.end, end) }))
                    .filter(range => range.end > range.start);
            }
            const busy = mergeRanges((Array.isArray(busyByDay[day]) ? busyByDay[day] : [])
                .filter(range => clock(range.start) && clock(range.end))
                .map(range => ({ start: Core.toMinutes(range.start), end: Core.toMinutes(range.end) })));
            ranges = subtractRanges(ranges, busy);
            const requestedCap = Number(override.maxStudyMinutes || intent.maxAvailableMinutesByDay?.[day] || 0);
            if (requestedCap > 0) {
                let remaining = Math.floor(requestedCap);
                ranges = ranges.map(range => {
                    const end = Math.min(range.end, range.start + remaining);
                    remaining -= end - range.start;
                    return { start: range.start, end };
                }).filter(range => range.end > range.start);
            }
            return ranges;
        },
        slots(input, busyByDay = {}, options = {}) {
            const constraints = this.normalize(input);
            const intent = options.intent || {};
            const slots = [], errors = [], warnings = [], dayPlans = {}, dayCapacity = {};
            for (let day = 1; day <= 7; day++) {
                const requestedTarget = Number(intent.targetBlocksPerDay);
                const targetBlocks = Number.isInteger(requestedTarget) && requestedTarget > 0
                    ? Math.min(8, requestedTarget) : constraints.targetBlocksPerDay;
                const enabled = constraints.studyDays.includes(day);
                const ranges = enabled ? this.freeRanges(day, constraints, busyByDay, intent) : [];
                const availableMinutes = total(ranges);
                const override = (intent.dayOverrides || []).find(item => Number(item.day) === day) || {};
                const reduced = Number(intent.reducedLoadByDay?.[day]);
                const requested = Number(override.targetBlocks);
                const effectiveTargetBlocks = enabled ? Math.min(targetBlocks,
                    Number.isInteger(reduced) && reduced >= 0 ? reduced : targetBlocks,
                    Number.isInteger(requested) && requested >= 0 ? requested : targetBlocks,
                    override.reduceLoad ? Math.max(0, targetBlocks - 1) : targetBlocks) : 0;
                const extras = constraints.mode === 'free' && (constraints.allowExtraBlocks || intent.allowExtraBlocks === true);
                const desired = extras && effectiveTargetBlocks === targetBlocks ? 8 : effectiveTargetBlocks;
                let selected = [];
                for (let count = desired; count >= 1; count--) {
                    const packed = pack(ranges, count, constraints);
                    if (packed) { selected = packed; break; }
                }
                let capacity = [];
                for (let count = 8; count >= 1; count--) {
                    const packed = pack(ranges, count, constraints);
                    if (packed) { capacity = packed; break; }
                }
                slots.push(...selected.map(slot => ({ day, ...slot })));
                const availableStudyMinutes = capacity.reduce((sum, slot) => sum + slot.duration, 0);
                dayCapacity[day] = capacity.length;
                const scheduledStudyMinutes = selected.reduce((sum, slot) => sum + slot.duration, 0);
                const status = !enabled ? 'off' : selected.length >= targetBlocks ? 'target_met' : 'adapted';
                const reason = !enabled ? 'Dia sem estudo' : status === 'target_met' ? 'Meta completa'
                    : effectiveTargetBlocks < targetBlocks ? 'Carga reduzida para este dia'
                        : availableMinutes === 0 ? 'Sem horário livre' : 'Carga adaptada ao horário disponível';
                dayPlans[day] = { day, targetBlocks, effectiveTargetBlocks, scheduledBlocks: selected.length,
                    availableMinutes, availableStudyMinutes, targetStudyMinutes: targetBlocks * constraints.blockMinutes,
                    scheduledStudyMinutes, status, reason };
                if (enabled && constraints.mode === 'rigid' && selected.length < effectiveTargetBlocks)
                    errors.push(`${DAY_NAMES[day]} comporta ${selected.length} de ${effectiveTargetBlocks} blocos. O modo rígido exige a meta completa; ajuste horários ou regras.`);
                else if (enabled && selected.length < effectiveTargetBlocks)
                    warnings.push(`Em ${DAY_NAMES[day]} cabem ${selected.length} blocos de ${effectiveTargetBlocks} planejados; a carga foi adaptada.`);
            }
            return { constraints, slots, errors, warnings, dayPlans, dayCapacity,
                requiredMinutes: this.requiredMinutes(constraints) };
        }
    };

    const UserStudyPreferences = {
        normalize(subjects = [], settings = {}) {
            return { maxSubjectsPerDay: integer(settings.maxSubjectsPerDay, 2, 1, 8),
                subjects: (Array.isArray(subjects) ? subjects : []).filter(item => item && item.subject && Number(item.schedule?.weeklyBlocks) > 0)
                    .map(item => ({ id: String(item.id), name: String(item.subject).trim(), weeklyBlocks: integer(item.schedule.weeklyBlocks, 1, 1, 30),
                        priority: integer(item.schedule.priority, 2, 1, 3), difficulty: integer(item.schedule.difficulty, 2, 1, 3),
                        contentLoad: integer(item.schedule.contentLoad, 2, 1, 3), consecutive: Boolean(item.schedule.consecutive),
                        preferredDay: integer(item.schedule.preferredDay, 0, 0, 7), examDate: String(item.schedule.examDate || ''),
                        overdueDays: integer(item.schedule.overdueDays, 0, 0, 365) })) };
        }
    };

    function selectedSlotsForWorkload(plan, preferences, options = {}) {
        const available = Array.isArray(plan?.slots) ? plan.slots : [];
        const wanted = Math.min(available.length, preferences.subjects.reduce((sum, item) => sum + item.weeklyBlocks, 0));
        if (!wanted) return [];
        const intent = options.intent || {};
        const keyOf = slot => `${slot.day}-${slot.order}`;
        const selected = new Set();
        const byDay = new Map(plan.constraints.studyDays.map(day => [day, available.filter(slot => slot.day === day)]));

        // Blocos já concluídos têm precedência absoluta, mesmo que estejam no fim da semana.
        for (const reserved of (options.reservedBlocks || [])) {
            const match = available.find(slot => slot.day === Number(reserved.day) && slot.start === reserved.start && slot.duration === Number(reserved.duration));
            if (match) selected.add(keyOf(match));
        }

        // Garante espaço para matérias que o usuário fixou em um dia específico.
        const fixedDemand = new Map();
        for (const subject of preferences.subjects) {
            const day = intent.preferredDays?.[subject.id] || subject.preferredDay;
            if (day) fixedDemand.set(day, (fixedDemand.get(day) || 0) + subject.weeklyBlocks);
        }
        for (const [day, count] of fixedDemand) {
            for (const slot of (byDay.get(day) || []).slice(0, count)) {
                if (selected.size >= Math.max(wanted, (options.reservedBlocks || []).length)) break;
                selected.add(keyOf(slot));
            }
        }

        // Preenche por rodadas (primeiro bloco de cada dia, depois o segundo...) para não
        // concentrar uma carga pequena inteira no começo da semana.
        const balanced = [...available].sort((a, b) => a.order - b.order || a.day - b.day);
        const target = Math.max(wanted, selected.size);
        for (const slot of balanced) {
            if (selected.size >= target) break;
            selected.add(keyOf(slot));
        }
        return available.filter(slot => selected.has(keyOf(slot)));
    }

    const AIScheduleAssistant = {
        interpret(raw = {}, message = '', constraintsInput = {}, subjectPlans = []) {
            const constraints = ScheduleConstraints.normalize(constraintsInput);
            const text = String(message || '');
            const errors = [], warnings = [];
            const plans = new Map(subjectPlans.map(item => [key(item.name), item]));
            const resolve = name => plans.get(key(name));
            const normalizedText = key(text);
            const dayMentions = Object.entries(DAY_NAMES).map(([day, name]) => ({ day: Number(day), index: normalizedText.indexOf(key(name)) }))
                .filter(item => item.index >= 0).sort((a, b) => a.index - b.index);
            const dayInText = dayMentions[0]?.day;
            const transientDay = dayInText || (/\bhoje\b/i.test(text) && validDay(constraintsInput.currentDay) ? Number(constraintsInput.currentDay) : 0);
            const requestedBlocks = Number(raw.requestedBlocksPerDay || 0);
            const writtenBlocks = Number(text.match(/\b(\d{1,2})\s+blocos?\s+(?:por|a\s+cada)\s+dia\b/i)?.[1] || 0);
            let transientBlocks = null;
            let targetBlocksPerDay = null;
            for (const count of unique([requestedBlocks, writtenBlocks])) if (count && count !== constraints.targetBlocksPerDay) {
                if (transientDay && count < constraints.targetBlocksPerDay) transientBlocks = count;
                else if (!transientDay && count <= 8) targetBlocksPerDay = count;
                else errors.push(`Você pediu ${count} blocos por dia, acima do máximo seguro de 8. Ajuste a meta nas configurações.`);
            }
            const requestedSubjectBlocks = Number(text.match(/\b(\d{1,2})\s+blocos?\s+de\s+[^.,]+\bhoje\b/i)?.[1] || 0);
            if (requestedSubjectBlocks > constraints.targetBlocksPerDay) {
                if (requestedSubjectBlocks <= 8) targetBlocksPerDay = requestedSubjectBlocks;
                else errors.push('O pedido ultrapassa o máximo seguro de 8 blocos por dia.');
            }
            if (targetBlocksPerDay && targetBlocksPerDay !== constraints.targetBlocksPerDay)
                warnings.push(`Nesta prévia, a meta diária será ${targetBlocksPerDay} blocos. Os horários livres continuam sendo o limite.`);
            const requestedEnd = String(raw.requestedEndTime || '').trim();
            const writtenEnd = !dayInText ? text.match(/(?:at[eé]|terminar|encerrar|finalizar)\s*(?:as|às)?\s*(\d{1,2}:[0-5]\d|\d{1,2}h(?:[0-5]\d)?)/i)?.[1]
                ?.toLowerCase().replace('h', ':').replace(/:$/, ':00').padStart(5, '0') : '';
            let transientEnd = '';
            let targetEndTime = '';
            for (const end of unique([requestedEnd, writtenEnd])) if (end && end !== constraints.endTime) {
                if (transientDay && clock(end)) transientEnd = end;
                else if (!transientDay && clock(end) && Core.toMinutes(end) < Core.toMinutes(constraints.endTime)) targetEndTime = end;
                else if (!transientDay && clock(end) && Core.toMinutes(end) > Core.toMinutes(constraints.endTime) && !writtenEnd)
                    errors.push(`O pedido nunca amplia o horário salvo: o limite permanece ${constraints.endTime}.`);
            }
            if (targetEndTime) warnings.push(`Nesta prévia, o estudo terminará até ${targetEndTime}; o horário salvo não muda.`);
            const priorityIds = unique((Array.isArray(raw.prioritySubjects) ? raw.prioritySubjects : []).map(resolve).filter(Boolean).map(item => item.id));
            if (/\bmais\b/i.test(text)) for (const item of subjectPlans) if (key(text).includes(key(item.name)) && !priorityIds.includes(item.id)) priorityIds.push(item.id);
            const preferredDays = {};
            for (const entry of (Array.isArray(raw.preferredDays) ? raw.preferredDays : [])) {
                const plan = resolve(entry?.subject), day = Number(entry?.day);
                if (!plan || !validDay(day)) continue;
                if (!constraints.studyDays.includes(day)) errors.push(`${plan.name} foi pedido para ${DAY_NAMES[day]}, mas esse dia está desativado.`);
                else if (plan.preferredDay && plan.preferredDay !== day) errors.push(`${plan.name} já tem outro dia fixado nas configurações.`);
                else preferredDays[plan.id] = day;
            }
            const avoidSameDay = [];
            for (const entry of (Array.isArray(raw.avoidSameDay) ? raw.avoidSameDay : [])) {
                const first = resolve(entry?.first), second = resolve(entry?.second);
                if (first && second && first.id !== second.id) avoidSameDay.push([first.id, second.id]);
            }
            const pairSubjectIds = unique((Array.isArray(raw.pairSubjects) ? raw.pairSubjects : []).map(resolve).filter(Boolean).map(item => item.id));
            if (/\b(?:manter|quero)\b/i.test(text) && /\b2\s+blocos\b/i.test(text)) for (const item of subjectPlans)
                if (key(text).includes(key(item.name)) && !pairSubjectIds.includes(item.id)) pairSubjectIds.push(item.id);

            const dayOverrides = (Array.isArray(raw.dayOverrides) ? raw.dayOverrides : []).filter(item => validDay(item?.day))
                .map(item => ({ day: Number(item.day), startTime: clock(item.startTime) ? item.startTime : undefined,
                    endTime: clock(item.endTime) ? item.endTime : undefined,
                    maxStudyMinutes: item.maxStudyMinutes == null ? undefined : integer(item.maxStudyMinutes, 0, 0, 720),
                    targetBlocks: item.targetBlocks == null ? undefined : integer(item.targetBlocks, 0, 0, constraints.targetBlocksPerDay),
                    reduceLoad: item.reduceLoad === true }));
            if (transientDay) {
                let override = dayOverrides.find(item => item.day === transientDay);
                if (!override) { override = { day: transientDay }; dayOverrides.push(override); }
                if (transientBlocks !== null && override.targetBlocks == null) override.targetBlocks = transientBlocks;
                if (transientEnd && !override.endTime) override.endTime = transientEnd;
            }
            for (const item of (Array.isArray(raw.dayOverrides) ? raw.dayOverrides : []))
                if (validDay(item?.day) && Number(item.targetBlocks) > constraints.targetBlocksPerDay)
                    errors.push(`${DAY_NAMES[item.day]} pediu ${item.targetBlocks} blocos, acima da meta salva de ${constraints.targetBlocksPerDay}.`);
            const inferredDays = dayMentions.length ? dayMentions :
                (/\bhoje\b/i.test(text) && validDay(constraintsInput.currentDay) ? [{ day: Number(constraintsInput.currentDay), index: 0 }] : []);
            for (let index = 0; index < inferredDays.length; index++) {
                const mention = inferredDays[index];
                if (!constraints.studyDays.includes(mention.day)) continue;
                let override = dayOverrides.find(item => item.day === mention.day);
                if (!override) { override = { day: mention.day }; dayOverrides.push(override); }
                const segmentStart = mention.index;
                const boundary = inferredDays[index + 1]?.index;
                const segment = normalizedText.slice(segmentStart, boundary || undefined);
                const hours = segment.match(/\b(?:so\s+)?(?:consigo\s+)?(?:estudar\s+)?(\d{1,2})\s*horas?\b/i);
                if (hours && !override.maxStudyMinutes) override.maxStudyMinutes = Math.min(720, Number(hours[1]) * 60);
                if (/\bmenos tempo\b|\bcansad[oa]\b|\breduz(?:ir|a|o)\b/i.test(segment)) override.reduceLoad = true;
                const localBlocks = Number(segment.match(/\b(?:so|apenas|somente)\s+(\d{1,2})\s+blocos?\b/i)?.[1] || 0);
                if (localBlocks && override.targetBlocks == null) override.targetBlocks = localBlocks;
                const end = segment.match(/\b(?:ate|termino|encerro|finalizo)\s*(?:as)?\s*(\d{1,2}:[0-5]\d|\d{1,2}h(?:[0-5]\d)?)/i)?.[1];
                if (end && !override.endTime) {
                    const parsed = end.toLowerCase().replace('h', ':').replace(/:$/, ':00').padStart(5, '0');
                    if (clock(parsed)) override.endTime = parsed;
                }
            }
            const temporaryAvailability = {}, reducedLoadByDay = {}, maxAvailableMinutesByDay = {};
            for (const item of dayOverrides) {
                if (!constraints.studyDays.includes(item.day)) { errors.push(`${DAY_NAMES[item.day]} está desativado nas preferências.`); continue; }
                if (Number(item.targetBlocks) > constraints.targetBlocksPerDay)
                    errors.push(`${DAY_NAMES[item.day]} pediu ${item.targetBlocks} blocos, acima da meta salva de ${constraints.targetBlocksPerDay}.`);
                const savedRanges = constraints.availability[item.day] || [];
                const savedStart = Math.min(...savedRanges.map(range => Core.toMinutes(range.start)));
                const savedEnd = Math.max(...savedRanges.map(range => Core.toMinutes(range.end)));
                if (item.startTime && Core.toMinutes(item.startTime) < savedStart)
                    errors.push(`${DAY_NAMES[item.day]} começa antes da disponibilidade cadastrada.`);
                if (item.endTime && Core.toMinutes(item.endTime) > savedEnd)
                    errors.push(`${DAY_NAMES[item.day]} termina depois da disponibilidade cadastrada.`);
                if (item.startTime || item.endTime) {
                    const start = item.startTime || '00:00', end = item.endTime || '23:59';
                    if (Core.toMinutes(end) <= Core.toMinutes(start)) errors.push(`O horário temporário de ${DAY_NAMES[item.day]} termina antes de começar.`);
                    else temporaryAvailability[item.day] = [{ start, end }];
                }
                if (item.maxStudyMinutes > 0) maxAvailableMinutesByDay[item.day] = item.maxStudyMinutes;
                if (item.reduceLoad || Number.isInteger(item.targetBlocks)) reducedLoadByDay[item.day] = Math.min(
                    item.reduceLoad ? Math.max(0, constraints.targetBlocksPerDay - 1) : constraints.targetBlocksPerDay,
                    Number.isInteger(item.targetBlocks) ? item.targetBlocks : constraints.targetBlocksPerDay);
            }
            if (text.trim() && !priorityIds.length && !Object.keys(preferredDays).length && !avoidSameDay.length && !dayOverrides.length && !pairSubjectIds.length && !errors.length)
                warnings.push('A mensagem não trouxe uma preferência aplicável; o plano seguirá as regras salvas.');
            return { priorityIds, preferredDays, avoidSameDay, pairSubjectIds, dayOverrides,
                temporaryAvailability, reducedLoadByDay, maxAvailableMinutesByDay,
                targetBlocksPerDay, targetEndTime,
                errors, warnings, explanation: String(raw.explanation || '').slice(0, 350) };
        }
    };

    function actualDayPlans(planned, blocks) {
        const result = {};
        for (let day = 1; day <= 7; day++) {
            const dayBlocks = blocks.filter(block => Number(block.day) === day);
            const base = planned[day];
            const scheduledBlocks = dayBlocks.length;
            result[day] = { ...base, scheduledBlocks,
                scheduledStudyMinutes: dayBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0),
                status: base.status === 'off' ? 'off' : scheduledBlocks >= base.targetBlocks ? 'target_met' : 'adapted',
                reason: base.status === 'off' ? 'Dia sem estudo' : scheduledBlocks >= base.targetBlocks ? 'Meta completa'
                    : base.status === 'target_met' ? 'Carga ajustada às metas das matérias' : base.reason };
        }
        return result;
    }

    const ScheduleValidator = {
        validate(schedule, constraintsInput, subjectsInput, options = {}) {
            const plan = ScheduleConstraints.slots(constraintsInput, options.busyByDay || {}, options);
            const preferences = UserStudyPreferences.normalize(subjectsInput, plan.constraints);
            const errors = [...plan.errors], warnings = [...plan.warnings];
            const blocks = Array.isArray(schedule?.blocks) ? schedule.blocks : [];
            const subjectIds = new Set(preferences.subjects.map(item => item.id));
            const seen = new Set();
            const intent = options.intent || {};
            for (const block of blocks) {
                const day = Number(block.day), order = Number(block.order), id = `${day}-${order}`;
                if (!validDay(day) || !plan.constraints.studyDays.includes(day)) { errors.push(`Bloco em um dia desativado: ${id}.`); continue; }
                if (!Number.isInteger(order) || order < 0 || seen.has(id)) errors.push(`Posição repetida ou inválida: ${id}.`);
                seen.add(id);
                if (!subjectIds.has(String(block.subjectId))) errors.push(`O bloco ${id} usa uma matéria não selecionada.`);
                const duration = Number(block.duration), start = Core.toMinutes(block.start), end = start + duration;
                const minimum = plan.constraints.durationMode === 'flexible' ? plan.constraints.minBlockMinutes : plan.constraints.blockMinutes;
                const maximum = plan.constraints.durationMode === 'flexible' ? plan.constraints.maxBlockMinutes : plan.constraints.blockMinutes;
                if (!clock(block.start) || !Number.isInteger(duration) || duration < minimum || duration > maximum)
                    errors.push(`O bloco ${id} não respeita a duração permitida de ${minimum}–${maximum} min.`);
                if (block.end && (!clock(block.end) || Core.toMinutes(block.end) !== end)) errors.push(`O término do bloco ${id} não combina com sua duração.`);
                const registrationEnd = end + plan.constraints.registrationMinutes;
                const ranges = ScheduleConstraints.freeRanges(day, plan.constraints, options.busyByDay || {}, intent);
                if (!ranges.some(range => start >= range.start && registrationEnd <= range.end))
                    errors.push(`O bloco ${id} ultrapassa um horário livre ou colide com a Agenda.`);
                if (block.registrationEnd && Core.toMinutes(block.registrationEnd) !== registrationEnd)
                    errors.push(`O registro após o bloco ${id} tem horário incorreto.`);
            }
            for (const day of plan.constraints.studyDays) {
                const dayBlocks = blocks.filter(block => Number(block.day) === day).sort((a, b) => Core.toMinutes(a.start) - Core.toMinutes(b.start));
                const effectiveTarget = plan.dayPlans[day].effectiveTargetBlocks;
                const extras = plan.constraints.mode === 'free' && (plan.constraints.allowExtraBlocks || intent.allowExtraBlocks === true);
                if (!extras && dayBlocks.length > effectiveTarget) errors.push(`${DAY_NAMES[day]} excede a meta permitida de ${effectiveTarget} blocos.`);
                if (extras && dayBlocks.length > 8) errors.push(`${DAY_NAMES[day]} excede o limite de segurança de 8 blocos.`);
                if (plan.constraints.mode === 'rigid' && dayBlocks.length !== effectiveTarget)
                    errors.push(`${DAY_NAMES[day]} precisa ter exatamente ${effectiveTarget} blocos no modo rígido.`);
                const names = new Set(dayBlocks.map(block => String(block.subjectId)));
                if (names.size > preferences.maxSubjectsPerDay)
                    errors.push(`${DAY_NAMES[day]} tem ${names.size} matérias; o máximo configurado é ${preferences.maxSubjectsPerDay}.`);
                const minimumPause = plan.constraints.pauseMode === 'flexible' ? plan.constraints.minPauseMinutes : plan.constraints.pauseMinutes;
                dayBlocks.forEach((block, index) => {
                    if (Number(block.order) !== index) errors.push(`A ordem dos blocos de ${DAY_NAMES[day]} não corresponde aos horários.`);
                });
                for (let index = 1; index < dayBlocks.length; index++) {
                    const previous = dayBlocks[index - 1], current = dayBlocks[index];
                    const gap = Core.toMinutes(current.start) - Core.toMinutes(previous.start) - Number(previous.duration)
                        - plan.constraints.registrationMinutes;
                    if (gap < minimumPause) errors.push(`A pausa entre os blocos ${index} e ${index + 1} de ${DAY_NAMES[day]} é menor que ${minimumPause} min.`);
                }
                for (const [first, second] of (intent.avoidSameDay || [])) if (names.has(first) && names.has(second))
                    errors.push(`${DAY_NAMES[day]} reúne duas matérias que você pediu para separar.`);
            }
            for (const subject of preferences.subjects) {
                const assigned = blocks.filter(block => String(block.subjectId) === subject.id);
                const fixedDay = intent.preferredDays?.[subject.id] || subject.preferredDay;
                if (!assigned.length) warnings.push(`${subject.name} ficou sem bloco nesta semana; revise a prioridade se necessário.`);
                if (fixedDay && assigned.some(block => Number(block.day) !== fixedDay)) errors.push(`${subject.name} deve ficar somente em ${DAY_NAMES[fixedDay]}.`);
                if (assigned.length && assigned.length !== subject.weeklyBlocks)
                    warnings.push(`${subject.name}: ${assigned.length} ${assigned.length === 1 ? 'bloco' : 'blocos'} no plano; meta semanal de ${subject.weeklyBlocks}.`);
                if ((subject.consecutive || intent.pairSubjectIds?.includes(subject.id)) && assigned.length === 1 && subject.weeklyBlocks >= 2)
                    warnings.push(`${subject.name} precisava de dois blocos consecutivos, mas só coube um nesta semana.`);
                if ((subject.consecutive || intent.pairSubjectIds?.includes(subject.id)) && assigned.length >= 2) {
                    const pair = assigned.some(block => assigned.some(other => other !== block && other.day === block.day && Math.abs(other.order - block.order) === 1));
                    if (!pair) warnings.push(`${subject.name} foi marcada para pares, mas não recebeu dois blocos juntos.`);
                }
            }
            for (const reserved of (options.reservedBlocks || [])) {
                const kept = [...blocks, ...(schedule?.archivedCompletedBlocks || [])].find(block => String(block.id) === String(reserved.id));
                if (!kept || String(kept.subjectId) !== String(reserved.subjectId) || kept.start !== reserved.start
                    || Number(kept.duration) !== Number(reserved.duration) || kept.status !== reserved.status || Number(kept.day) !== Number(reserved.day))
                    errors.push('Um bloco já concluído seria alterado. Gere novamente sem mexer no histórico.');
            }
            return { valid: errors.length === 0, errors: unique(errors), warnings: unique(warnings), constraints: plan.constraints,
                dayPlans: actualDayPlans(plan.dayPlans, blocks) };
        }
    };

    const ScheduleGenerator = {
        generate(subjectsInput, constraintsInput, weekKey, options = {}) {
            const plan = ScheduleConstraints.slots(constraintsInput, options.busyByDay || {}, options);
            const preferences = UserStudyPreferences.normalize(subjectsInput, plan.constraints);
            const intent = options.intent || {};
            const errors = [...plan.errors, ...(intent.errors || [])];
            const initialWarnings = [...plan.warnings, ...(intent.warnings || [])];
            if (!preferences.subjects.length) errors.push('Defina pelo menos uma matéria com blocos por semana.');
            if (errors.length) return { valid: false, errors: unique(errors), warnings: [], blocks: [], constraints: plan.constraints, dayPlans: plan.dayPlans };
            const blocks = selectedSlotsForWorkload(plan, preferences, options).map(slot => ({ ...slot, id: `plano-${weekKey}-${slot.day}-${slot.order}`,
                subjectId: '', kind: 'teoria', topic: '', status: 'pending', registered: false }));
            const archivedCompletedBlocks = [];
            for (const reserved of (Array.isArray(options.reservedBlocks) ? options.reservedBlocks : [])) {
                const slot = blocks.find(block => block.day === Number(reserved.day) && block.start === reserved.start && block.duration === Number(reserved.duration));
                if (!slot || slot.subjectId) { archivedCompletedBlocks.push({ ...reserved }); continue; }
                Object.assign(slot, reserved, { day: slot.day, order: slot.order, start: slot.start, end: slot.end,
                    duration: slot.duration, registrationEnd: slot.registrationEnd });
            }
            if (errors.length) return { valid: false, errors: unique(errors), warnings: [], blocks: [], constraints: plan.constraints, dayPlans: plan.dayPlans };
            const counts = new Map(preferences.subjects.map(item => [item.id, 0]));
            blocks.filter(block => block.subjectId).forEach(block => counts.set(String(block.subjectId), (counts.get(String(block.subjectId)) || 0) + 1));
            const weekTimestamp = Core.fromIso(weekKey).getTime();
            const assignedDays = new Map(preferences.subjects.map(item => [item.id,
                new Set(blocks.filter(block => String(block.subjectId) === item.id).map(block => Number(block.day)))]));
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
                const candidates = preferences.subjects.filter(item => {
                    if ((counts.get(item.id) || 0) >= item.weeklyBlocks) return false;
                    const fixedDay = intent.preferredDays?.[item.id] || item.preferredDay;
                    if (fixedDay && fixedDay !== block.day) return false;
                    if (!daySubjects.has(item.id) && daySubjects.size >= preferences.maxSubjectsPerDay) return false;
                    return !(intent.avoidSameDay || []).some(([first, second]) =>
                        (item.id === first && daySubjects.has(second)) || (item.id === second && daySubjects.has(first)));
                }).map(item => {
                    const used = counts.get(item.id) || 0;
                    const deficit = item.weeklyBlocks - used;
                    const sameDay = daySubjects.has(item.id);
                    const sameAsPrevious = previousBlock && String(previousBlock.subjectId) === item.id;
                    const paired = item.consecutive || intent.pairSubjectIds?.includes(item.id);
                    const lastStudy = Number(options.lastStudiedBySubject?.[item.id]) || 0;
                    const daysSinceStudy = lastStudy > 0 ? Math.max(0, Math.min(21, Math.floor((weekTimestamp - lastStudy) / 86400000))) : 21;
                    const daySlotsRemaining = blocks.filter(other => other.day === block.day && other.order >= block.order).length;
                    const exam = /^\d{4}-\d{2}-\d{2}$/.test(item.examDate) ? Math.max(0, 30 - Math.floor((Core.fromIso(item.examDate).getTime() - weekTimestamp) / 86400000)) : 0;
                    const score = (used === 0 ? 20 : 0) + Math.max(-3, deficit) * 20 + (deficit <= 0 ? -500 : 0)
                        + item.priority * 12 + item.difficulty * 3
                        + item.contentLoad + daysSinceStudy * .5 + item.overdueDays * .5 + exam
                        + (intent.priorityIds || []).includes(item.id) * 35 + (sameDay ? 28 : 0)
                        + (sameAsPrevious ? (paired && used < item.weeklyBlocks && runLength < 2 ? 140 : 5) : 0)
                        - (sameAsPrevious && runLength >= 2 ? 120 : 0)
                        - (paired && daySlotsRemaining === 1 && !sameDay ? 40 : 0)
                        - (assignedDays.get(item.id)?.has(block.day - 1) ? 9 : 0);
                    return { item, score };
                }).sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'pt-BR'));
                const chosen = candidates[0]?.item;
                if (!chosen) continue;
                block.subjectId = chosen.id;
                block.kind = previousBlock?.subjectId === chosen.id ? 'questoes' : 'teoria';
                counts.set(chosen.id, (counts.get(chosen.id) || 0) + 1);
                assignedDays.get(chosen.id).add(block.day);
            }
            const assignedBlocks = blocks.filter(block => block.subjectId);
            for (const day of plan.constraints.studyDays) assignedBlocks.filter(block => block.day === day)
                .forEach((block, order) => { block.order = order; });
            const unscheduled = preferences.subjects.map(item => ({ subjectId: item.id, subject: item.name,
                blocks: Math.max(0, item.weeklyBlocks - (counts.get(item.id) || 0)) })).filter(item => item.blocks > 0);
            const generated = { key: Core.monday(weekKey), blocks: assignedBlocks, archivedCompletedBlocks,
                unscheduled, dailyClosures: {}, warnings: [], generatedAt: Date.now() };
            const check = ScheduleValidator.validate(generated, plan.constraints, subjectsInput, options);
            return { ...generated, valid: !errors.length && check.valid, errors: unique([...errors, ...check.errors]),
                warnings: unique([...initialWarnings, ...check.warnings,
                    ...(archivedCompletedBlocks.length ? [`${archivedCompletedBlocks.length} bloco(s) já concluído(s) fora das janelas atuais serão preservados como registros anteriores, sem ocupar espaço no novo plano.`] : [])]),
                constraints: plan.constraints, dayPlans: check.dayPlans };
        }
    };

    window.KingSchedulePlanner = { ScheduleConstraints, UserStudyPreferences, AIScheduleAssistant, ScheduleGenerator, ScheduleValidator };
})();
