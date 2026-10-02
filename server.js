// Servidor do site: serve as páginas, fala com a IA (Gemini), lê/grava imóveis
// e contatos no Supabase, cuida do login da área /admin e do upload de fotos.

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import multer from 'multer';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.set('trust proxy', 1); // necessário para o cookie de login funcionar atrás do proxy do Render
app.use(cors());
app.use(express.json());

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// ===== IA do chat (Gemini) =====
const geminiKey = process.env.GEMINI_API_KEY?.trim();
if (!geminiKey) {
  throw new Error('Configure GEMINI_API_KEY no arquivo .env antes de iniciar o servidor.');
}
const genAI = new GoogleGenAI({ apiKey: geminiKey });
const MODEL = 'gemini-2.5-flash';

// ===== Banco de dados e arquivos (Supabase) =====
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.');
}
const supabase = createClient(supabaseUrl, supabaseKey);
const PHOTOS_BUCKET = 'fotos-imoveis';

// ===== Login da área de administrador =====
const adminUser = process.env.ADMIN_USER;
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;
if (!adminUser || !adminPassword) {
  throw new Error('Configure ADMIN_USER e ADMIN_PASSWORD no arquivo .env para proteger a área /admin.');
}
if (!sessionSecret) {
  throw new Error('Configure SESSION_SECRET no arquivo .env (qualquer texto longo e aleatório).');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdminPage(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.redirect('/login');
}

function requireAdminApi(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Não autenticado.' });
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ===== Páginas e arquivos públicos =====
app.get('/', (_req, res) => res.sendFile(resolve(projectRoot, 'grupo-orlando-neto.html')));
app.get('/grupo-orlando-neto.html', (_req, res) => res.sendFile(resolve(projectRoot, 'grupo-orlando-neto.html')));
app.get('/style.css', (_req, res) => res.sendFile(resolve(projectRoot, 'style.css')));
app.get('/20250805_105655.png', (_req, res) => res.sendFile(resolve(projectRoot, '20250805_105655.png')));
app.get('/login', (_req, res) => res.sendFile(resolve(projectRoot, 'login.html')));
app.get('/regiao.html', (_req, res) => res.sendFile(resolve(projectRoot, 'regiao.html')));
app.get('/imovel.html', (_req, res) => res.sendFile(resolve(projectRoot, 'imovel.html')));

// ===== Login / logout =====
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username && password && safeEqual(username, adminUser) && safeEqual(password, adminPassword)) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Usuário ou senha inválidos.' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ===== Área de administrador (protegida por login) =====
app.get('/admin', requireAdminPage, (_req, res) => res.sendFile(resolve(projectRoot, 'admin.html')));
app.use('/api/admin', requireAdminApi); // tudo abaixo desta linha em /api/admin/* exige login

// ===== Imóveis: leitura pública (usada pelo site e pelo admin) =====
app.get('/api/listings', async (req, res) => {
  let query = supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (req.query.region) {
    query = query.eq('region', req.query.region);
  }
  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar imóveis:', error);
    return res.status(500).json({ error: 'Erro ao buscar imóveis.' });
  }
  res.json(data);
});

app.get('/api/listings/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) {
    console.error('Erro ao buscar imóvel:', error);
    return res.status(404).json({ error: 'Imóvel não encontrado.' });
  }
  res.json(data);
});

// ===== Imóveis: criar / editar / excluir (só admin) =====
app.post('/api/admin/listings', async (req, res) => {
  const { data, error } = await supabase.from('listings').insert(req.body).select().single();
  if (error) {
    console.error('Erro ao criar imóvel:', error);
    return res.status(500).json({ error: 'Erro ao criar imóvel.' });
  }
  res.json(data);
});

app.put('/api/admin/listings/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar imóvel:', error);
    return res.status(500).json({ error: 'Erro ao atualizar imóvel.' });
  }
  res.json(data);
});

app.delete('/api/admin/listings/:id', async (req, res) => {
  const { error } = await supabase.from('listings').delete().eq('id', req.params.id);
  if (error) {
    console.error('Erro ao excluir imóvel:', error);
    return res.status(500).json({ error: 'Erro ao excluir imóvel.' });
  }
  res.json({ ok: true });
});

// ===== Upload de fotos (só admin) =====
app.post('/api/admin/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (uploadError) {
    console.error('Erro ao enviar foto:', uploadError);
    return res.status(500).json({
      error: 'Erro ao enviar a foto. Confira se o bucket "fotos-imoveis" existe e está marcado como público no Supabase.'
    });
  }

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
  res.json({ url: data.publicUrl });
});

// ===== Contatos do formulário: enviar (público) / listar (admin) =====
app.post('/api/leads', async (req, res) => {
  const { name, phone, neighborhood, message } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
  }
  const { error } = await supabase.from('leads').insert({ name, phone, neighborhood, message });
  if (error) {
    console.error('Erro ao salvar contato:', error);
    return res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
  res.json({ ok: true });
});

app.get('/api/admin/leads', async (_req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar contatos:', error);
    return res.status(500).json({ error: 'Erro ao buscar contatos.' });
  }
  res.json(data);
});

app.patch('/api/admin/leads/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .update({ contacted: !!req.body.contacted })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar contato:', error);
    return res.status(500).json({ error: 'Erro ao atualizar contato.' });
  }
  res.json(data);
});

// ===== Chat com a assistente (Gemini) =====
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
    const interaction = await genAI.interactions.create({
      model: MODEL,
      input: message,
      system_instruction: SYSTEM_PROMPT,
      previous_interaction_id: previousInteractionId || undefined
    });

    res.json({
      text: interaction.output_text || 'Não consegui gerar uma resposta.',
      interactionId: interaction.id
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
