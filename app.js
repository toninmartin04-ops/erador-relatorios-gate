Chart.register(ChartDataLabels);
let chartViagens = null; let chartMedia = null;

function getConfig(titulo, dados, labels, isFloat) {
    return {
        type: 'line', data: { labels: labels, datasets: [{ data: dados, borderColor: 'white', backgroundColor: 'white', borderWidth: 3.5, tension: 0.4, pointRadius: 6 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: titulo, color: 'white', font: { size: 18, weight: 'bold' }, padding: { bottom: 40 } }, datalabels: { color: 'white', align: 'top', offset: 12, font: { weight: 'bold', size: 15 }, formatter: v => isFloat ? parseFloat(v).toFixed(3) : v } },
            scales: { x: { ticks: { color: 'white', font: { weight: 'bold', size: 12 } }, grid: { display: false, drawBorder: false } }, y: { display: false, min: Math.min(...dados) * 0.7, max: Math.max(...dados) * 1.3 } },
            layout: { padding: { top: 20, right: 30, left: 30, bottom: 20 } }
        }
    };
}

async function processarImagem() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const file = document.getElementById('imagemUpload').files[0];
    const status = document.getElementById('status');

    if (!apiKey || !file) { alert("Preencha a chave e anexe a imagem."); return; }
    
    // Verificação de segurança básica para ver se colou uma chave válida
    if (!apiKey.startsWith("AIza")) {
        status.innerText = "Erro: Chave inválida. Ela deve começar com AIza.";
        status.style.color = "red";
        return;
    }
    
    status.innerText = "Lendo os dados da imagem... Aguarde.";
    status.style.color = "#0078D7";

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Image = e.target.result.split(',')[1];
        const promptTexto = "Analise a imagem desta planilha de expedição. Extraia os períodos da coluna EXPEDIDO TERNO, os valores da coluna VIAGENS e os valores da coluna MEDIA P/ CAMINHÃO. Ignore a linha final de TOTAL. Retorne estritamente um JSON neste formato: {\"labels\": [\"01/09 - 01x07\"], \"viagens\": [38], \"media\": [27.818]}. Não escreva mais nada, apenas o JSON.";

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptTexto }, { inline_data: { mime_type: file.type, data: base64Image } }] }] })
            });
            
            if (!response.ok) {
                throw new Error(`Erro de conexão: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const textoPuro = result.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
            const dados = JSON.parse(textoPuro);
            
            if (chartViagens) chartViagens.destroy();
            if (chartMedia) chartMedia.destroy();
            
            chartViagens = new Chart(document.getElementById('graficoViagens').getContext('2d'), getConfig("QUANTIDADE VIAGENS POR PERÍODO", dados.viagens, dados.labels, false));
            chartMedia = new Chart(document.getElementById('graficoMedia').getContext('2d'), getConfig("MÉDIA TONELADA POR CAMINHÃO NO PERÍODO", dados.media, dados.labels, true));
            
            document.getElementById('relatorio-view').style.display = 'block';
            status.innerText = "Concluído! Abrindo PDF...";
            
            setTimeout(() => { window.print(); document.getElementById('relatorio-view').style.display = 'none'; status.innerText = ""; }, 1000);
        } catch (error) {
            status.innerText = "Erro ao ler a imagem. Verifique se a imagem está nítida ou se a chave está correta. Detalhe: " + error.message;
            status.style.color = "red";
            console.error(error);
        }
    };
    reader.readAsDataURL(file);
}
