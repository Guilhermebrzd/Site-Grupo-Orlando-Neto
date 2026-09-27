// Servidor simples que recebe as mensagens do chat do site e repassa para a Interactions API do Gemini (Google).
// A chave da API fica só aqui no servidor (variável de ambiente) — nunca no HTML/JS do navegador.
//
// Como usar:
//   1. npm install
//   2. Cole uma chave válida em GEMINI_API_KEY no arquivo .env
//   3. npm start
//
// O front-end (grupo-orlando-neto.html) já está chamando POST /api/chat

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(cors());
app.use(express.json());

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error('Configure GEMINI_API_KEY no arquivo .env antes de iniciar o servidor.');
}

const client = new GoogleGenAI({ apiKey });
const MODEL = 'gemini-2.5-flash'; // rápido e barato; confira em aistudio.google.com se ainda é o nome atual

app.get('/', (_req, res) => res.sendFile(resolve(projectRoot, 'grupo-orlando-neto.html')));
app.get('/grupo-orlando-neto.html', (_req, res) => res.sendFile(resolve(projectRoot, 'grupo-orlando-neto.html')));
app.get('/style.css', (_req, res) => res.sendFile(resolve(projectRoot, 'style.css')));
app.get('/20250805_105655.png', (_req, res) => res.sendFile(resolve(projectRoot, '20250805_105655.png')));

const SYSTEM_PROMPT = `Você é a assistente virtual do site do Grupo Orlando Neto Imóveis, em João Pessoa/PB.
Responda sempre em português, de forma breve e simpática (no máximo 4-5 frases).
Ajude o visitante a encontrar imóveis com base nestes exemplos disponíveis no site (deixe claro que a disponibilidade deve ser confirmada com um corretor):
- Lançamento VILLA MARINE, Altiplano Cabo Branco, apartamentos com vista para o mar.
- Lançamento THE PALM, Tambaú, flats compactos perto da orla.
- Lançamento OCEANIA RESIDENCE, Jardim Oceania, plantas de 2 e 3 quartos.
- Aluguel: apartamento mobiliado no Bessa (R$2.700), casa em condomínio no Altiplano (R$3.200), sala comercial no Tambauzinho (R$9.000).
- Venda: apartamento vista mar em Cabo Branco (R$620.000), apartamento compacto em Manaíra (R$415.000), casa alto padrão no Altiplano Cabo Branco (R$1.350.000).
Se a pergunta fugir do assunto imóveis/João Pessoa, redirecione gentilmente para o tema. Sempre finalize sugerindo falar com um corretor pelo WhatsApp (83) 99000-4545 quando fizer sentido.`;

app.post('/api/chat', async (req, res) => {
  const { message, previousInteractionId } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Mensagem inválida.' });
  }

  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: message,
      system_instruction: SYSTEM_PROMPT,
      // Continua a conversa no servidor do Google, sem precisar reenviar o histórico inteiro.
      previous_interaction_id: previousInteractionId || undefined
    });

    res.json({
      text: interaction.output_text || 'Não consegui gerar uma resposta.',
      interactionId: interaction.id // o front-end guarda isso e reenvia na próxima pergunta
    });
  } catch (err) {
    console.error('Erro ao chamar a Interactions API:', err);
    res.status(500).json({ error: 'Falha ao consultar a IA.' });
  }
});

const PORT = Number(process.env.PORT || 3000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT deve ser um número entre 1 e 65535.');
}

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
