const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const caminhoLinksJson = path.join(__dirname, 'links.json');

async function baixarArquivo(url, pastaDestino, nomeArquivo) {
    const caminhoCompleto = path.join(pastaDestino, nomeArquivo);
    
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
            const writer = fs.createWriteStream(caminhoCompleto);
            const response = await axios({ 
                url, 
                method: 'GET', 
                responseType: 'stream', 
                timeout: 60000 
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            return;
        } catch (erro) {
            if (fs.existsSync(caminhoCompleto)) {
                fs.unlinkSync(caminhoCompleto);
            }
            if (tentativa === 3) {
                console.error(`❌ Falha ao baixar ${nomeArquivo}: ${erro.message}`);
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
    console.log(`🚀 Iniciando coleta em lote de ${editais.length} páginas cadastradas...`);

    for (const edital of editais) {
        console.log(`\n📂 Processando: Ano ${edital.ano} - ${edital.chamada}`);
        console.log(`🔗 URL: ${edital.url}`);
        
        const pastaDestino = path.join(__dirname, 'downloads', 'UFOPA', edital.ano, edital.chamada);
        if (!fs.existsSync(pastaDestino)) {
            fs.mkdirSync(pastaDestino, { recursive: true });
        }

        try {
            const { data: html } = await axios.get(edital.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                timeout: 30000
            });
            const $ = cheerio.load(html);
            
            const pdfsDestaPagina = [];
            $('a').each((i, el) => {
                let href = $(el).attr('href');
                let textoLink = $(el).text().trim();

                if (href && (href.toLowerCase().includes('.pdf') || href.toLowerCase().includes('download'))) {
                    if (!href.startsWith('http')) {
                        const origin = new URL(edital.url).origin;
                        href = `${origin}${href.startsWith('/') ? '' : '/'}${href}`;
                    }
                    let nomeSeguro = textoLink.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || `curso_${i}`;
                    pdfsDestaPagina.push({ url: href, nome: `${nomeSeguro}.pdf` });
                }
            });

            const unicos = [...new Map(pdfsDestaPagina.map(p => [p.url, p])).values()];
            console.log(`📄 Encontrados ${unicos.length} PDFs nesta página.`);

            for (let i = 0; i < unicos.length; i++) {
                console.log(`[${i + 1}/${unicos.length}] Baixando: ${unicos[i].nome}`);
                await baixarArquivo(unicos[i].url, pastaDestino, unicos[i].nome);
                await new Promise(r => setTimeout(r, 1000));
            }

        } catch (erro) {
            console.error(`❌ Erro ao acessar a URL ${edital.url}:`, erro.message);
        }
    }

    console.log("\n🎉 Coleta em lote finalizada com sucesso!");
}

iniciarColetaEmLote();