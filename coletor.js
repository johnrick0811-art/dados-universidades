const fs = require('fs');
const path = require('path');

const caminhoLinksJson = path.join(__dirname, 'links.json');

async function baixarArquivo(url, pastaDestino, nomeArquivo) {
    const caminhoCompleto = path.join(pastaDestino, nomeArquivo);
    
    // Evita baixar duplicados se já existir
    if (fs.existsSync(caminhoCompleto)) return true;

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(caminhoCompleto, buffer);
            return true;
        } catch (erro) {
            if (fs.existsSync(caminhoCompleto)) {
                fs.unlinkSync(caminhoCompleto);
            }
            if (tentativa === 3) {
                return false;
            } else {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
}

async function iniciarColetaEmLote() {
    if (!fs.existsSync(caminhoLinksJson)) {
        console.error("❌ O arquivo 'links.json' não foi encontrado na pasta!");
        return;
    }

    const editais = JSON.parse(fs.readFileSync(caminhoLinksJson, 'utf8'));
    console.log(`🚀 Iniciando coleta seletiva de ${editais.length} páginas da UFOPA...`);

    for (const edital of editais) {
        console.log(`\n📂 Processando: Ano ${edital.ano} - ${edital.chamada}`);
        console.log(`🔗 URL: ${edital.url}`);
        
        const pastaDestino = path.join(__dirname, 'downloads', 'UFOPA', edital.ano, edital.chamada);
        if (!fs.existsSync(pastaDestino)) {
            fs.mkdirSync(pastaDestino, { recursive: true });
        }

        try {
            const response = await fetch(edital.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const html = await response.text();
            
            // Procura estritamente por links que terminem em .pdf ou contenham palavras-chave de resultados/listões
            const regexLinks = /href="([^"]+\.pdf[^"]*)"/g;
            let match;
            const pdfsDestaPagina = [];
            let i = 0;

            while ((match = regexLinks.exec(html)) !== null) {
                let href = match[1];
                
                if (!href.startsWith('http')) {
                    const origin = new URL(edital.url).origin;
                    href = `${origin}${href.startsWith('/') ? '' : '/'}${href}`;
                }

                // Extrai o nome real do ficheiro PDF da URL
                const partes = href.split('/');
                let nomeArquivo = partes[partes.length - 1].split('?')[0];
                if (!nomeArquivo.toLowerCase().endsWith('.pdf')) {
                    nomeArquivo = `documento_${i++}.pdf`;
                }

                pdfsDestaPagina.push({ url: href, nome: nomeArquivo });
            }

            const unicos = [...new Map(pdfsDestaPagina.map(p => [p.url, p])).values()];
            console.log(`📄 Encontrados ${unicos.length} PDFs válidos nesta página.`);

            for (let j = 0; j < unicos.length; j++) {
                console.log(`[${j + 1}/${unicos.length}] Baixando: ${unicos[j].nome}`);
                await baixarArquivo(unicos[j].url, pastaDestino, unicos[j].nome);
                await new Promise(r => setTimeout(r, 500));
            }

        } catch (erro) {
            console.error(`❌ Erro ao acessar a URL ${edital.url}:`, erro.message);
        }
    }

    console.log("\n🎉 Coleta seletiva finalizada com sucesso!");
}

iniciarColetaEmLote();
