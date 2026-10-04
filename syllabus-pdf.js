import * as pdfjs from './assets/pdfjs/pdf.min.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('./assets/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

window.KingSyllabusPdf = {
    async extract(file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const task = pdfjs.getDocument({ data: bytes });
        const document = await task.promise;
        const pages = [];
        let length = 0;
        try {
            if (document.numPages > 120) throw new Error('Este PDF tem páginas demais para uma análise rápida. Separe o trecho relevante (até 120 páginas).');
            for (let number = 1; number <= document.numPages; number++) {
                const page = await document.getPage(number);
                const content = await page.getTextContent();
                const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
                if (text) { length += text.length; if (length > 120000) throw new Error('O texto do PDF é muito longo. Separe somente o trecho necessário para análise.'); pages.push(`Página ${number}\n${text}`); }
                page.cleanup();
            }
        } finally {
            await document.destroy();
        }
        if (pages.join('').length < 120) throw new Error('Este PDF parece ser uma imagem sem texto selecionável. Envie uma imagem nítida ou um PDF com texto.');
        return pages;
    },
    async extractAgenda(file) {
        const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages = [];
        try {
            if (pdfDocument.numPages > 20) throw new Error('O PDF tem mais de 20 páginas. Separe as páginas da agenda que quer importar.');
            for (let number = 1; number <= pdfDocument.numPages; number++) {
                const page = await pdfDocument.getPage(number);
                const content = await page.getTextContent();
                const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
                if (text) pages.push(`Página ${number}: ${text}`);
                page.cleanup();
            }
        } finally { await pdfDocument.destroy(); }
        return { text: pages.join('\n').slice(0, 35000) };
    },
    async renderAgendaImages(file) {
        const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const images = [];
        try {
            if (pdfDocument.numPages > 4) throw new Error('Este PDF digitalizado tem mais de 4 páginas. Envie só as páginas da agenda que quer importar.');
            for (let number = 1; number <= pdfDocument.numPages; number++) {
                const page = await pdfDocument.getPage(number);
                const natural = page.getViewport({ scale: 1 });
                const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(natural.width, natural.height)) });
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
                await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport }).promise;
                images.push({ mimeType: 'image/jpeg', base64: canvas.toDataURL('image/jpeg', 0.82).split(',')[1] });
                canvas.width = 0; canvas.height = 0; page.cleanup();
            }
        } finally { await pdfDocument.destroy(); }
        return images;
    }
};
