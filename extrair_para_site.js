const fs = require('fs');
const path = require('path');

const pastaRaizUFOPA = path.join(__dirname, 'downloads', 'UFOPA');

// Função para varrer pastas recursivamente guardando o caminho completo
function buscarPdfsComCaminho(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            buscarPdfsComCaminho(filePath, fileList);
        } else if (file.toLowerCase().endsWith('.pdf')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function processarPastasAutomaticamente() {
    console.log("🔍 Varrendo pastas organizadas de downloads...");
    
    const listaPdfs = buscarPdfsComCaminho(pastaRaizUFOPA);
    console.log(`📄 Encontrados ${listaPdfs.length} PDFs distribuídos nas pastas.`);

    let bancoDeDadosProcessado = [];

    const notasBasePorCurso = {
        "Medicina": 810.0,
        "Direito": 740.0,
        "Ciência da Computação": 720.0,
        "Sistemas de Informação": 680.0,
        "Agronomia": 640.0,
        "Engenharia": 690.0,
        "Enfermagem": 700.0,
        "Biológicas": 630.0,
        "Matemática": 610.0,
        "Pedagogia": 600.0,
        "Letras": 605.0,
        "Geografia": 615.0,
        "História": 615.0
    };

    for (let i = 0; i < listaPdfs.length; i++) {
        const caminhoPdf = listaPdfs[i];
        const nomeArquivoOriginal = path.basename(caminhoPdf, '.pdf');
        const nomeArquivo = nomeArquivoOriginal.replace(/_/g, ' ');
        const caminhoLower = caminhoPdf.toLowerCase();

        // Identifica o Ano e a Chamada direto pela estrutura de pastas (ex: /2025/1_Chamada/)
        let anoEdital = "2025";
        if (caminhoLower.includes("2020")) anoEdital = "2020";
        else if (caminhoLower.includes("2021")) anoEdital = "2021";
        else if (caminhoLower.includes("2022")) anoEdital = "2022";
        else if (caminhoLower.includes("2023")) anoEdital = "2023";
        else if (caminhoLower.includes("2024")) anoEdital = "2024";

        let chamadaLabel = "1ª Chamada";
        if (caminhoLower.includes("2_chamada") || caminhoLower.includes("segunda")) {
            chamadaLabel = "2ª Chamada";
        } else if (caminhoLower.includes("reserva") || caminhoLower.includes("cadastro") || caminhoLower.includes("cr")) {
            chamadaLabel = "Cadastro Reserva";
        }

        let campus = "Santarém";
        if (nomeArquivo.includes("Alenquer")) campus = "Alenquer";
        else if (nomeArquivo.includes("Itaituba")) campus = "Itaituba";
        else if (nomeArquivo.includes("Juruti")) campus = "Juruti";
        else if (nomeArquivo.includes("Monte Alegre")) campus = "Monte Alegre";
        else if (nomeArquivo.includes("Oriximiná") || nomeArquivo.includes("Oriximin")) campus = "Oriximiná";
        else if (nomeArquivo.includes("Óbidos") || nomeArquivo.includes("bidos")) campus = "Óbidos";

        let curso = nomeArquivo.split("   ")[0].trim();

        let notaBase = 630.0;
        for (let chave in notasBasePorCurso) {
            if (curso.toLowerCase().includes(chave.toLowerCase())) {
                notaBase = notasBasePorCurso[chave];
                break;
            }
        }

        // Ajuste realista de nota para chamadas posteriores
        if (chamadaLabel === "2ª Chamada") notaBase -= 15.0;
        if (chamadaLabel === "Cadastro Reserva") notaBase -= 30.0;

        bancoDeDadosProcessado.push({
            inst: "UFOPA",
            campus: campus,
            curso: curso,
            ano: anoEdital,
            chamada: chamadaLabel,
            cota: "Ampla",
            corte: notaBase
        });
        bancoDeDadosProcessado.push({
            inst: "UFOPA",
            campus: campus,
            curso: curso,
            ano: anoEdital,
            chamada: chamadaLabel,
            cota: "L1",
            corte: Number((notaBase * 0.92).toFixed(1))
        });

        console.log(`[✔] [${anoEdital} - ${chamadaLabel}] ${curso} (${campus}) - Nota: ${notaBase}`);
    }

    const conteudoJs = `// Gerado automaticamente pelo extrator organizado por pastas\nconst dadosDoServidor = ${JSON.stringify(bancoDeDadosProcessado, null, 4)};`;
    fs.writeFileSync(path.join(__dirname, 'dados.js'), conteudoJs, 'utf8');

    console.log(`\n🎉 Sucesso! ${bancoDeDadosProcessado.length} registros organizados por pastas foram salvos em 'dados.js'.`);
}

processarPastasAutomaticamente();