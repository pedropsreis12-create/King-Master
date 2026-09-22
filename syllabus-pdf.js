import * as pdfjs from './assets/pdfjs/pdf.min.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('./assets/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

window.KingSyllabusPdf = {
    async extract(file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const task = pdfjs.getDocument({ data: bytes });
        const document = await task.promise;
        const pages = [];
        try {
            for (let number = 1; number <= document.numPages; number++) {
                const page = await document.getPage(number);
                const content = await page.getTextContent();
                const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
                if (text) pages.push(`Página ${number}\n${text}`);
                page.cleanup();
            }
        } finally {
            await document.destroy();
        }
        if (pages.join('').length < 120) throw new Error('Este PDF parece ser uma imagem sem texto selecionável. Envie uma imagem nítida ou um PDF com texto.');
        return pages;
    }
};
