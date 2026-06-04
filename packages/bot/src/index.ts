import path from 'path'
import dotenv from 'dotenv'
import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import http from "http";

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const token = process.env.TELEGRAM_BOT_TOKEN;
const geminiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const geminiBaseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';

if (!token || !geminiKey || !supabaseUrl || !supabaseKey) {
  throw new Error("Missing environment variables (TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, SUPABASE_URL, or SUPABASE_SECRET_KEY)");
}

const bot = new Bot(token);
const supabase = createClient(supabaseUrl, supabaseKey);
const pendingConfirmations = new Map<string, string>(); // Link confirmations
const pendingTitheSelection = new Map<string, any>();
const ADMIN_TELEGRAM_ID = '5637235532'; // substituir pelo seu ID

const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function sanitizeSubtype(subtype: string): string {
  if (subtype === 'variable') return 'unique';
  if (['fixed', 'semifixed', 'unique'].includes(subtype)) return subtype;
  return 'unique';
}

const SYSTEM_PROMPT = `
Você é um assistente financeiro inteligente chamado Pera.
Sua tarefa é extrair informações financeiras de mensagens de texto e retornar SEMPRE um ARRAY de objetos JSON válidos.

REGRAS DE CLASSIFICAÇÃO:
1. "subtype":
   - "fixed": Despesas recorrentes obrigatórias sem prazo de fim (aluguel, internet, luz, água, dízimo, plano de saúde, condomínio).
   - "semifixed": Despesas recorrentes com prazo de fim ou temporárias (terapia, curso, parcelamentos, tratamentos, assinaturas temporárias).
   - "unique": Despesas pontuais sem recorrência (alimentação fora, lazer, compras avulsas).
2. "urgency":
   - "urgent": Emergências, imprevistos, saúde urgente, conserto de carro, remédio urgente, contas fixas obrigatórias.
   - "necessity": Gastos necessários para sobrevivência — alimentação, transporte público (ônibus, metrô, trem), saúde básica, higiene.
   - "secondary": Todo o resto — lazer, transporte de aplicativos (uber, 99, etc), vestuário, eletrônicos, streaming, etc.
3. CASOS ESPECÍFICOS:
   - "Dízimo" -> subtype: "fixed".
   - "Oferta" ou "Ofertas" -> subtype: "variable".
4. PARCELAMENTOS:
   - Se o usuário mencionar parcelas (ex: "em 3x", "6 vezes", "parcelei"), defina "is_installment": true e "installment_count": [número de parcelas].
5. CONTAS FIXAS/RECORRENTES — PRIORIDADE ALTA:
   Se a mensagem mencionar QUALQUER combinação de:
   - Um nome de conta/serviço (água, luz, aluguel, internet, etc.)
   - Um valor
   - Um dia de vencimento (ex: "dia 13", "todo dia 5", "vence dia 10")
   
   INDEPENDENTE DA ORDEM, retorne type: "bill" com:
   - "name": nome da conta
   - "value": número
   - "due_day": número do dia
   
   EXEMPLOS que devem retornar type: "bill":
   - "65 reais conta de água todo dia 13"
   - "aluguel 1500 dia 10"
   - "internet 120 vence todo dia 5"
   - "dia 20 luz 200"
   
   OBRIGATÓRIO: A mensagem SÓ deve retornar type: "bill" se
   contiver EXPLICITAMENTE um dia de vencimento (ex: "dia 13",
   "todo dia 5", "vence dia 10", "dia 20").

   SEM dia de vencimento = NÃO é bill.

   EXEMPLOS que NÃO devem retornar type: "bill":
   - "0,03 contas" → type: "expense", category: "Contas"
   - "15 luz" → type: "expense", category: "Contas"
   - "10 gemini" → type: "expense", category: "Contas"
   - "5 claude" → type: "expense", category: "Contas"
   - "20 netflix" → type: "expense", category: "Lazer"

   EXEMPLOS que devem retornar type: "bill":
   - "luz 150 dia 10" → type: "bill"
   - "internet 120 vence todo dia 5" → type: "bill"
   - "gemini 50 dia 15" → type: "bill", variable_value: true
   - "claude 20 dia 1" → type: "bill", variable_value: true

   REGRA DE IAs (Gemini, Claude, GPT, Copilot, etc):
   - Sem data → type: "expense", category: "Contas"
   - Com data → type: "bill", variable_value: true

6. CATEGORIAS PADRONIZADAS (OBRIGATÓRIO):
   A categoria DEVE ser uma destas exatamente:
   - "Alimentação": itens básicos e essenciais — arroz, feijão, macarrão, carne, frango, peixe, ovos, leite, manteiga, queijo, iogurte, frutas, verduras, legumes, pão simples, bolo caseiro, hortifruti, açougue, padaria, produtos de mercado não industrializados. IMPORTANTE: Qualquer compra em padaria = "Alimentação", independente do item.
   - "Transporte": uber, táxi, combustível, gasolina, estacionamento, ônibus, metrô, passagem.
   - "Saúde": farmácia, médico, plano de saúde, exames, hospital, academia, esportes, terapia.
   - "Lazer": cinema, streaming, netflix, spotify, jogos, viagem, entretenimento, restaurante, lanchonete, cafeteria, sorvete, delivery, pizza, hambúrguer, bar, fast food. Também inclui produtos industrializados de prazer/snacks: salgadinhos, biscoitos recheados, chocolates, balas, bombons, barras de proteína, energéticos, refrigerantes, chips, amendoim industrializado e similares → subcategoria "Petiscos".
   REGRA EXPLÍCITA: produto industrializado de prazer/snack (mesmo comprado no mercado) → Lazer/Petiscos. Produto básico/essencial → Alimentação.
   - "Educação": curso, livro, school, faculdade, material escolar.
   - "Contas": luz, água, internet, aluguel, condomínio, telefone, gás, iptu, ipva.
   - "Vestuário": roupa, calçado, tênis, sapato, acessório, bolsa.
   - "Eletrônicos": celular, computador, notebook, tv, eletrodoméstico, gadget, fone.
   - "Dízimo/Oferta": dízimo, oferta, contribuição, doação para igreja.
   - "Outros": qualquer gasto que não se encaixe nas categorias acima.
   
   REGRA ESPECIAL PADARIA: ATENÇÃO: A palavra 'padaria' sozinha indica categoria 'Alimentação', não 'Lazer'. Lazer inclui restaurantes, lanchonetes, pizzarias, fast food e similares.

7. LIMITE DE ORÇAMENTO:
   Se a mensagem mencionar alteração de limite ou orçamento para uma categoria, retorne type: "budget_limit" com:
   - "category": nome da categoria (usar as categorias padronizadas da regra 6)
   - "limit_value": número do novo limite

   EXEMPLOS que devem retornar type: "budget_limit":
   - "limite alimentação 800"
   - "alterar limite de lazer para 500"
   - "aumentar limite de saúde para 1000"
   - "diminuir limite vestuário para 200"

   Pode retornar múltiplos itens no array se houver várias categorias na mesma frase.

8. SUBCATEGORIAS (preencher quando aplicável):
Adicionar campo "subcategory" ao JSON para as seguintes categorias:

"Alimentação":
  - "Mercado": supermercado, mercadinho, extra, atacadão, rancho, feira
  - "Padaria": padaria, pão, bolo, salgado, confeitaria, pão de queijo

"Lazer":
  - "Fast Food": pizza, hambúrguer, refrigerante, energético, lanchonete, cafeteria, fast food genérico, refeição rápida
  - "Delivery": ifood, rappi, uber eats, pedido online, delivery
  - "Restaurante": restaurante, almoço, jantar, self-service, rodízio
  - "Lanchonete": hambúrguer, pizza, hot dog, lanche, burguer
  - "Cafeteria": café, starbucks, cafeteria, coffee, cappuccino
  - "Doces": sorvete, açaí, confeitaria, brigadeiro, bolo de festa, doceria, chocolateria, sobremesa
  - "Petiscos": salgadinho, pringles, biscoito recheado, chips, barra de chocolate, bombom, chocolate, doce industrializado, bala, goma, pirulito, amendoim industrializado, castanha industrializada, pipoca de micro-ondas, energético, refrigerante, barra de proteína, proteína em pó, petisco industrializado, snack, doce salgado

"Saúde":
  - "Farmácia": farmácia, remédio, medicamento, drogaria, droga raia, sabonete, shampoo, condicionador, escova de dentes, pasta de dente, creme, hidratante, cuidados pessoais, higiene pessoal, produtos de higiene
  - "Médico": médico, consulta, dentista, psicólogo, terapia, clínica
  - "Academia": academia, gym, crossfit, natação, musculação, esporte
  - "Exames": exame, laboratório, raio-x, ultrassom, hemograma

"Transporte":
  - "Uber/Táxi": uber, 99, táxi, cabify, corrida
  - "Combustível": gasolina, combustível, posto, etanol, abasteci
  - "Transporte Público": ônibus, metrô, passagem, bilhete único, trem

Para outras categorias (Contas, Vestuário, etc.), não incluir subcategory.

9. CLASSIFICAÇÃO DE TIPO DE CUSTO (subtype) E PRIORIDADE (urgency) - MUITO IMPORTANTE:
   - "subtype": Deve ser "fixed" (contas fixas/assinaturas mensais constantes), "semifixed" (compras parceladas com fim previsível) ou "unique" (gastos diários, compras corriqueiras, compras avulsas únicas).
   - "urgency": Deve ser "urgent" (toda transação de necessidade não cotidiana que foge do controle, ex: remédios, farmácia, conserto de carro, 2ª via de doc), "necessity" (importante para subsistência diária, ex: alimentos pro dia a dia, mercado, itens de casa, gasolina) ou "secondary" (tudo que não se encaixa nas outras duas, ex: lazer, fastfood, doces, restaurantes).

JSON Structure (dentro do array):
{
  "value": número (decimal, se for expense/income),
  "limit_value": número (decimal, se for budget_limit),
  "type": "expense" | "income" | "payment" | "bill" | "budget_limit",
  "category": "Alimentação" | "Transporte" | "Saúde" | "Lazer" | "Educação" | "Contas" | "Vestuário" | "Eletrônicos" | "Dízimo/Oferta" | "Outros",
  "subtype": "fixed" | "semifixed" | "unique",
  "urgency": "urgent" | "necessity" | "secondary",
  "description": string curta,
  "name": string (apenas se for type: bill),
  "due_day": número OBRIGATÓRIO se type: "bill", null caso contrário,
  "is_installment": boolean,
  "installment_count": número (opcional),
  "subcategory": string (opcional),
  "payment_method": "credit" | "debit" (opcional, incluir apenas se mencionado)
}

Se o usuário disser 'paguei [nome]', 'pagar [nome]', 'quitei [nome]', retorne type: 'payment' com description: nome do que foi pago. Se o usuário incluir o valor pago, adicione também o campo "value". Se não tiver valor, não inclua o campo "value". O sistema usará o valor enviado ou buscará o padrão cadastrado automaticamente.

EXEMPLOS que devem retornar type: 'payment':
- 'paguei terapia' → { type: 'payment', description: 'terapia' }
- 'paguei 85 da conta de luz' → { type: 'payment', description: 'luz', value: 85 }
- 'quitei o aluguel' → { type: 'payment', description: 'aluguel' }
- 'paguei 120 da academia' → { type: 'payment', description: 'academia', value: 120 }

VALOR + PRODUTO SEM CONTEXTO EXPLÍCITO:
Quando a mensagem for um número seguido de produto SEM verbos
de intenção de compra, interpretar o número como valor em reais:
- "3 limão" → { type: "expense", value: 3, description: "limão", category: "Alimentação" }
- "0,47 limão" → { type: "expense", value: 0.47, description: "limão", category: "Alimentação" }
- "10 desodorante" → { type: "expense", value: 10, description: "desodorante", category: "Saúde" }
- "5 pão" → { type: "expense", value: 5, description: "pão", category: "Alimentação" }
- "15 uber" → { type: "expense", value: 15, description: "uber", category: "Transporte" }

NÃO retorne not_financial para mensagens com 'paguei/pagar/quitei'.

RECONHECIMENTO DE DÍZIMO — PRIORIDADE ALTA:
Se a mensagem tiver QUALQUER intenção de pagar dízimo, mesmo com
erros de digitação, variações ou palavras parecidas como:
"dizimo", "dízimo", "disimo", "dissimo", "dissimu", "dízmo",
"dizmo", "tithe", "décimo", "decimo", "pagar dizimo", "paguei dizimo"
ou qualquer variação fonética próxima → retornar SEMPRE:
{ "type": "payment", "description": "dízimo" }

NÃO retornar not_financial para essas mensagens.


10. MÉTODO DE PAGAMENTO:
Se a mensagem mencionar "crédito", "no crédito", "cartão", "no cartão" → adicionar "payment_method": "credit" ao JSON.
Se mencionar "débito", "no débito" → adicionar "payment_method": "debit" ao JSON.
Se não mencionar → não incluir o campo.

EXEMPLOS:
- "50 hamburguer crédito" → { ..., "payment_method": "credit" }
- "50 hamburguer débito" → { ..., "payment_method": "debit" }
- "50 hamburguer" → { ... } (sem payment_method)

Se a mensagem não contiver informações financeiras, retorne: {"error": "not_financial"}.

MENSAGEM DO USUÁRIO:
`;

const CORRECTION_PROMPT = `
O usuário quer corrigir uma transação financeira. Analise a mensagem e retorne um JSON com os campos que devem ser alterados. Retorne APENAS os campos mencionados.

Retorne neste formato:
{
  "value": número ou null,
  "description": string ou null,
  "category": string ou null,
  "subtype": "fixed", "variable", "semifixed" ou null,
  "urgency": "urgent", "necessity", "secondary" ou null,
  "installments": número ou null,
  "delete": true ou null
}

Regras:
- Se mencionar valor/preço/reais → preenche value
- Se a mensagem for APENAS um número (ex: "3", "45.50", "100") → preenche value com esse número
- Se mencionar nome/descrição/era/chama → preenche description
- Se mencionar categoria/tipo de gasto → preenche category
- Se mencionar subcategoria específica como "mercado", "padaria", 
  "delivery", "restaurante", "farmácia", "academia", "uber", etc.
  → preenche subcategory com o nome da subcategoria
  → E se a categoria principal for inferível, preenche category também
- Se mencionar fixo/obrigatório/mensalidade → subtype: fixed
- Se mencionar variável/avulso/esporádico → subtype: variable
- Se mencionar semi-fixo/temporário/por enquanto → subtype: semifixed
- Se mencionar urgente/emergência/imprevisto/necessidade não cotidiana → urgency: urgent
- Se mencionar necessidade/subsistência/básico/dia a dia → urgency: necessity
- Se mencionar variável/lazer/extra/não essencial → urgency: secondary
- Se mencionar parcelas/vezes/dividir/x → preenche installments
- Se mencionar apagar/deletar/excluir/remover/cancelar → delete: true
- Retorna null nos campos não mencionados

REGRA CRÍTICA DE URGÊNCIA:
Quando o usuário mencionar apenas uma categoria ou subcategoria
(ex: 'lazer', 'alimentação', 'fast food', 'mercado', 'padaria'),
retornar SOMENTE o campo category e/ou subcategory.
NÃO retornar urgency a menos que o usuário mencione explicitamente
palavras como 'urgente', 'urgência', 'necessário', 'necessidade',
'secundário', 'essencial'.
Nota: 'lazer' deve atualizar category, NÃO urgency.

Exemplos:
- "3" → { "value": 3, ... }
- "foi 90" → { "value": 90, ... }
- "deletar" → { "delete": true, ... }
- "lazer" → { "category": "Lazer", "urgency": null, ... }
- "alimentação" → { "category": "Alimentação", "urgency": null, ... }

MÉTODO DE PAGAMENTO:
Se a mensagem mencionar "crédito", "no crédito", "cartão",
"no cartão" → adicionar "payment_method": "credit" ao JSON.
Se mencionar "débito", "no débito" → adicionar
"payment_method": "debit" ao JSON.
Se não mencionar → não incluir o campo (será definido pela
preferência padrão do usuário).

EXEMPLOS:
- "50 hamburguer crédito" → { ..., "payment_method": "credit" }
- "50 hamburguer débito" → { ..., "payment_method": "debit" }
- "50 hamburguer" → { ... } (sem payment_method)

MENSAGEM:
`;

const SHOPPING_PROMPT = `
Você detecta intenção de adicionar itens a uma lista de compras.
Retorne SEMPRE um JSON.

REGRA PRINCIPAL:
- Se a mensagem for APENAS o nome de um produto SEM número → lista
- Se tiver verbo de intenção de compra + produto (com ou sem número) → lista
- Se tiver "preciso" + produto (com ou sem número) → lista
- Se tiver número + produto SEM verbo de intenção → NÃO é lista (é transação)

Verbos de intenção: comprar, pegar, buscar, trazer, adquirir, obter,
precisar comprar, quero comprar, vou comprar, lembra de pegar, etc.

EXEMPLOS que devem retornar is_shopping: true:
- "desodorante" → { "is_shopping": true, "items": ["desodorante"] }
- "leite" → { "is_shopping": true, "items": ["leite"] }
- "comprar 10 desodorante" → { "is_shopping": true, "items": ["desodorante (10)"] }
- "preciso de ovos" → { "is_shopping": true, "items": ["ovos"] }
- "preciso comprar 5 ovos" → { "is_shopping": true, "items": ["ovos (5)"] }
- "lembra de pegar leite" → { "is_shopping": true, "items": ["leite"] }
- "kmprar pão" → { "is_shopping": true, "items": ["pão"] }
- "arroz e feijão" → { "is_shopping": true, "items": ["arroz", "feijão"] }

EXEMPLOS que devem retornar is_shopping: false (são transações):
- "0,47 limão" → { "is_shopping": false }
- "3 limão" → { "is_shopping": false }
- "10 desodorante" → { "is_shopping": false }
- "5 ovos" → { "is_shopping": false }
- "gastei 50 no mercado" → { "is_shopping": false }
- "recebi 3000" → { "is_shopping": false }

Aceite erros de digitação e gramática. Foque na intenção.
Se não for lista de compras, retorne: { "is_shopping": false }

MENSAGEM:
`;

const AMBIGUOUS_PROMPT = `
Detecta mensagens com verbo de ação no passado + produto
SEM valor monetário. Exemplos: "comprei amendoim",
"peguei leite", "trouxe pão", "fui na farmácia buscar shampoo".

Se detectar esse padrão → retorne:
{
  "is_ambiguous": true,
  "verb_used": "comprei",
  "verb_infinitive": "comprar",
  "product": "amendoim"
}

Se não for esse padrão → retorne: { "is_ambiguous": false }

Não considerar ambíguo quando:
- Tiver valor monetário: "comprei amendoim por 2,29"
- For infinitivo: "comprar amendoim"
- For só o produto: "amendoim"
- Tiver "paguei" + valor (é transação clara)

MENSAGEM:
`;

function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'id';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

bot.command("start", async (ctx) => {
  await ctx.reply(`🍐 Olá! Bem-vindo ao Pera!

Envie o código de 6 dígitos que aparece no app para vincular sua conta. 📲`);
});

bot.command("broadcast", async (ctx) => {
  const senderId = ctx.from?.id.toString();

  if (senderId !== ADMIN_TELEGRAM_ID) {
    return ctx.reply('❌ Você não tem permissão para usar este comando.');
  }

  const message = ctx.message.text.replace('/broadcast', '').trim();

  if (!message) {
    return ctx.reply('⚠️ Use: /broadcast sua mensagem aqui');
  }

  // Buscar todos os telegram_ids cadastrados
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('telegram_id')
    .not('telegram_id', 'is', null);

  if (error || !profiles?.length) {
    return ctx.reply('❌ Erro ao buscar usuários ou nenhum usuário cadastrado.');
  }

  let success = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      await bot.api.sendMessage(profile.telegram_id, message, { parse_mode: 'Markdown' });
      success++;
    } catch (e) {
      failed++;
      console.error(`Falha ao enviar para ${profile.telegram_id}:`, e);
    }
  }

  return ctx.reply(`✅ Broadcast enviado!\n✔️ ${success} entregues\n❌ ${failed} falhas`);
});

function isDizimo(text: string): boolean {
  const t = text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos

  // Palavras-chave exatas ou contidas
  const keywords = ['dizimo', 'tithe', 'oferta', 'dizmo', 'dismo', 'dizino'];
  if (keywords.some(k => t.includes(k))) return true;

  // Similaridade simples — aceita até 2 erros em palavras de 5+ chars
  function levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[a.length][b.length];
  }

  const words = t.split(/\s+/);
  return words.some(w => w.length >= 4 && levenshtein(w, 'dizimo') <= 2);
}

function parseMonth(text: string): number | null {
  const t = text.toLowerCase();
  const months = [
    ['janeiro', 'jan'],
    ['fevereiro', 'fev'],
    ['março', 'marco', 'mar'],
    ['abril', 'abr'],
    ['maio'],
    ['junho', 'jun'],
    ['julho', 'jul'],
    ['agosto', 'ago'],
    ['setembro', 'set'],
    ['outubro', 'out'],
    ['novembro', 'nov'],
    ['dezembro', 'dez']
  ];

  for (let i = 0; i < months.length; i++) {
    if (months[i].some(m => t.includes(m))) {
      return i + 1;
    }
  }
  return null;
}

async function getTitheSummary(supabaseUserId: string) {
  const [profileRes, txRes, paymentsRes] = await Promise.all([
    supabase.from('user_profiles').select('tithe_percentage, tithe_percentage_previous, tithe_percentage_changed_at').eq('user_id', supabaseUserId).single(),
    supabase.from('transactions').select('id, description, value, occurred_at')
      .eq('user_id', supabaseUserId).eq('counts_for_tithe', true).eq('type', 'income')
      .order('occurred_at', { ascending: false }),
    supabase.from('tithe_payments').select('*')
      .eq('user_id', supabaseUserId).order('paid_at', { ascending: false })
  ]);

  const percentage = profileRes.data?.tithe_percentage ?? 10;
  const incomes = txRes.data || [];
  const payments = paymentsRes.data || [];

  const monthlyMap: Record<string, any> = {};
  incomes.forEach(inc => {
    const d = new Date(inc.occurred_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        key,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        total_income: 0,
        tithe_due: 0,
        incomes: []
      };
    }
    monthlyMap[key].total_income += Number(inc.value);
    monthlyMap[key].incomes.push(inc);
  });

  const changedAt = profileRes.data?.tithe_percentage_changed_at;
  const previousPct = profileRes.data?.tithe_percentage_previous ?? percentage;

  Object.values(monthlyMap).forEach((m: any) => {
    m.tithe_due = 0;
    m.incomes.forEach((inc: any) => {
      const incDate = new Date(inc.occurred_at);
      const pctToUse = (changedAt && incDate < new Date(changedAt))
        ? previousPct
        : percentage;
      m.tithe_due += Number(inc.value) * (pctToUse / 100);
    });
  });

  const sortedMonths = Object.values(monthlyMap).sort((a: any, b: any) =>
    a.key.localeCompare(b.key)
  );

  let remainingPayments = payments.reduce((sum, p) => sum + Number(p.value), 0);
  sortedMonths.forEach((m: any) => {
    if (remainingPayments >= m.tithe_due) {
      m.paid = m.tithe_due;
      m.balance_due = 0;
      remainingPayments -= m.tithe_due;
    } else {
      m.paid = remainingPayments;
      m.balance_due = m.tithe_due - remainingPayments;
      remainingPayments = 0;
    }
  });

  return sortedMonths.filter(m => m.balance_due > 0.01);
}

function levenshteinDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

const pendingCardSelection = new Map<string, any>();
const pendingCardRegistration = new Map<string, any>();
// Estrutura: { item, shortCode, step, bank?, closing_day?, due_day? }

const pendingInstallmentSetup = new Map<string, {
  item: any;
  shortCode: string;
  startThisMonth?: boolean;
  cardId?: string;
}>();

const pendingReceiptReview = new Map<string, {
  items: Array<{
    id: string;
    description: string;
    value: number;
    category: string;
    subcategory?: string;
  }>;
  paymentMethod: string;
  editingItemId?: string;
}>();

const pendingBillValue = new Map<string, {
  bill: any;
  supabaseUserId: string;
}>();

function getBillingMonth(closingDay: number): string {
  const today = new Date();
  const day = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  if (day >= closingDay) {
    const next = new Date(year, month + 1, 1);
    return next.toISOString().split('T')[0];
  }
  return new Date(year, month, 1).toISOString().split('T')[0];
}

async function registerCreditTransaction(
  supabaseUserId: string,
  item: any,
  shortCode: string,
  creditCardId: string,
  closingDay: number,
  dueDay: number
) {
  const billingMonth = getBillingMonth(closingDay);

  // Calcular due_date
  const bm = new Date(billingMonth);
  const dueDate = new Date(bm.getFullYear(), bm.getMonth(), dueDay)
    .toISOString().split('T')[0];

  // 1. Inserir transação
  await supabase.from('transactions').insert({
    user_id: supabaseUserId,
    value: item.value,
    type: item.type,
    category: item.category || 'Outros',
    subtype: sanitizeSubtype(item.subtype || 'unique'),
    urgency: item.urgency || 'variable',
    description: item.description || 'Sem descrição',
    source: 'text',
    short_code: shortCode,
    subcategory: item.subcategory || null,
    payment_method: 'credit',
    credit_card_id: creditCardId,
    billing_month: billingMonth
  });

  // 2. Upsert fatura
  const { data: existingBill } = await supabase
    .from('credit_card_bills')
    .select('id, amount')
    .eq('credit_card_id', creditCardId)
    .eq('billing_month', billingMonth)
    .maybeSingle();

  if (existingBill) {
    await supabase
      .from('credit_card_bills')
      .update({ amount: Number(existingBill.amount) + Number(item.value) })
      .eq('id', existingBill.id);
  } else {
    await supabase.from('credit_card_bills').insert({
      user_id: supabaseUserId,
      credit_card_id: creditCardId,
      amount: item.value,
      billing_month: billingMonth,
      due_date: dueDate,
      paid: false
    });
  }
}

async function fetchGemini(geminiKey: string, body: object, retries = 3): Promise<any> {
  const url = `${geminiBaseUrl}/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) return res.json();
    if ((res.status === 503 || res.status === 429) && i < retries - 1) {
      const delay = res.status === 429 ? 30000 : 2000 * (i + 1);
      console.log(`[GEMINI] Rate limit (${res.status}), aguardando ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${res.status} ${JSON.stringify(err)}`);
  }
}


const RECEIPT_PROMPT = `
Analise esta imagem de nota fiscal brasileira e extraia
os itens comprados.

REGRA PRINCIPAL DO NOME:
Extraia SOMENTE o tipo do produto em português simples,
com apenas a primeira letra maiúscula.
IGNORE completamente: marcas, quantidades, unidades,
códigos, abreviações.

EXEMPLOS DE TRANSFORMAÇÃO DE NOME:
- "FILEZ SASSAMI SADIA BAN 1 UN" → "Filé sassami"
- "QUEIJO MUSSARELA DEALE FA 500G" → "Queijo mussarela"
- "REFRIGERANTE COCA COLA 2L" → "Refrigerante"
- "AGUA MINERAL CRYSTAL 500ML" → "Água mineral"
- "ARROZ AGULHINHA TIOJOAO 5KG" → "Arroz"
- "PAO DE FORMA WICKBOLD" → "Pão de forma"
- "LEITE INTEGRAL ITALAC 1L" → "Leite integral"
- "FRANGO INTEIRO SADIA KG" → "Frango"

REGRAS DE VALOR:
- Use o valor da linha do item, não o total da nota
- IGNORE linhas de: TOTAL, SUBTOTAL, TROCO, DESCONTO,
  VALOR PAGO, DINHEIRO, CARTÃO, TAXA

Retorne APENAS um array JSON válido:
[
  {
    "description": "nome simples do produto",
    "value": número decimal com ponto,
    "category": "categoria",
    "subcategory": "subcategoria se aplicável",
    "urgency": "urgent" | "necessity" | "secondary"
  }
]

CATEGORIAS: Alimentação, Transporte, Saúde, Lazer,
Educação, Contas, Vestuário, Eletrônicos, Dízimo/Oferta, Outros.

SUBCATEGORIAS:
- Alimentação: Mercado, Padaria
- Lazer: Fast Food, Delivery, Restaurante, Lanchonete,
  Cafeteria, Doces, Petiscos
- Saúde: Farmácia, Médico, Academia, Exames
- Transporte: Uber/Táxi, Combustível, Transporte Público

URGÊNCIA (campo obrigatório para cada item):
- "urgent": remédios, emergências, consultas médicas urgentes
- "necessity": alimentação básica (mercado, padaria, feijão,
  arroz, frango, carne, pão, leite, ovos, frutas, verduras),
  higiene, transporte, contas
- "secondary": refrigerante, suco, cerveja, sorvete, doces,
  petiscos, salgadinho, biscoito, chocolate, fast food,
  delivery, restaurante, lazer, vestuário, eletrônicos

ATENÇÃO: Supermercado tem itens de ambas as categorias.
Classifique item a item:
- Arroz, feijão, frango, ovos → necessity + Alimentação/Mercado
- Refrigerante, cerveja, salgadinho → secondary + Lazer/Petiscos

Se não identificar itens, retorne [].
`;

async function sendReceiptReview(
  ctx: any,
  supabaseUserId: string,
  items: any[],
  paymentMethod: string
) {
  const fmtR = (n: number) => `R$ ${Number(n).toFixed(2)}`;
  const total = items.reduce((s: number, i: any) => s + i.value, 0);
  const payLabel = paymentMethod === 'credit' ? '💳 Crédito' : '🏦 Débito';

  let text = `🧾 *Nota fiscal detectada* — ${payLabel}\n\n`;
  items.forEach((item: any, idx: number) => {
    const subcat = item.subcategory ? ` | ${item.subcategory}` : '';
    text += `${idx + 1}. *${item.description}*\n`;
    text += `   💰 ${fmtR(item.value)} · 📂 ${item.category}${subcat}\n\n`;
  });
  text += `*Total: ${fmtR(total)}*\n\nConfirma o registro?`;

  const keyboard = new InlineKeyboard();
  items.forEach((item: any, idx: number) => {
    keyboard
      .text(`✏️ Editar ${idx + 1}`, `receipt_edit_${item.id}`)
      .text(`🗑️ Remover ${idx + 1}`, `receipt_remove_${item.id}`)
      .row();
  });
  keyboard.text('✅ Confirmar tudo', 'receipt_confirm').row();
  keyboard.text('❌ Cancelar', 'receipt_cancel');

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

bot.on("message:photo", async (ctx) => {
  const userId = ctx.from.id.toString();
  const caption = ctx.message.caption?.trim() || '';

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id, default_payment')
      .eq('telegram_id', userId)
      .maybeSingle();

    if (!profile?.user_id) {
      return ctx.reply('❌ Conta não vinculada. Acesse o app para vincular.');
    }

    const supabaseUserId = profile.user_id;

    const captionLower = caption.toLowerCase();
    let paymentMethod = profile.default_payment || 'debit';
    if (captionLower.includes('crédito') || captionLower.includes('credito') || captionLower.includes('cartão')) {
      paymentMethod = 'credit';
    } else if (captionLower.includes('débito') || captionLower.includes('debito')) {
      paymentMethod = 'debit';
    }

    await ctx.reply('🔍 Analisando a nota fiscal...');

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileInfo = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    const fileRes = await fetch(fileUrl);
    const fileBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString('base64');
    const mimeType = 'image/jpeg';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: RECEIPT_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } }
            ]
          }]
        })
      }
    );

    if (!geminiRes.ok) {
      throw new Error(`Gemini error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim().replace(/```json|```/g, '') || '[]';

    const items = JSON.parse(rawText);

    if (!Array.isArray(items) || items.length === 0) {
      return ctx.reply('❌ Não consegui identificar itens na nota. Tente uma foto mais nítida.');
    }

    const itemsWithId = items.map((item: any, idx: number) => ({
      id: `item_${idx}`,
      description: item.description || 'Item',
      value: Number(item.value) || 0,
      category: item.category || 'Outros',
      subcategory: item.subcategory || undefined
    }));

    pendingReceiptReview.set(supabaseUserId, {
      items: itemsWithId,
      paymentMethod
    });

    await sendReceiptReview(ctx, supabaseUserId, itemsWithId, paymentMethod);

  } catch (e) {
    console.error('[FOTO] Erro:', e);
    await ctx.reply('⚠️ Erro ao processar a imagem. Tente novamente.');
  }
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id.toString();

  console.log(`Mensagem recebida: [${text}]`);

  try {
    // --- Lookup do UUID do Supabase ---
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('telegram_id', userId)
      .maybeSingle();

    const supabaseUserId = profile?.user_id;

    // Verifica se é um código de vinculação (6 dígitos)
    if (/^\d{6}$/.test(text)) {
      console.log(`[DEBUG] Recebido código de vínculo: ${text}`);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('link_code', text)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        const isAlreadyPending = pendingConfirmations.get(userId) === text;

        if (!isAlreadyPending) {
          // Verifica se este Telegram já está vinculado a OUTRA conta
          const { data: existingLink } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('telegram_id', userId)
            .neq('user_id', data.user_id)
            .maybeSingle();

          if (existingLink) {
            console.log('[LINK] existingLink:', existingLink, 'userId:', userId, 'data.user_id:', data.user_id);
            pendingConfirmations.set(userId, text);
            await ctx.reply('⚠️ Este Telegram já está vinculado a outra conta Pera.\n\nAo continuar, a conta anterior será desvinculada automaticamente.\n\nEnvie o código novamente para confirmar. 🍐');
            return;
          }
        }

        // Se chegou aqui, ou não tinha vínculo anterior, ou já confirmou
        pendingConfirmations.delete(userId);

        // 1. Limpa qualquer outro perfil que use este mesmo telegram_id (cleanup)
        await supabase
          .from('user_profiles')
          .update({ telegram_id: null, linked_at: null })
          .eq('telegram_id', userId)
          .neq('user_id', data.user_id);

        // 2. Atualiza estritamente a mesma linha localizada usando ID garantido do banco
        await supabase
          .from('user_profiles')
          .update({
            telegram_id: userId,
            linked_at: new Date().toISOString()
          })
          .eq('user_id', data.user_id);


        await ctx.reply(`✅ Conta vinculada com sucesso! 🍐

Agora você pode me enviar seus gastos assim:

💸 Gastos: "gastei 45 no iFood", "50 padaria"
💰 Receitas: "recebi 3000 de salário"
📋 Contas fixas: "internet 120 dia 10"
🛍️ Parcelamentos: "notebook 2400 em 12x"
✏️ Corrigir: "#CODE foi 90", "#CODE deletar"
📊 Limites: "limite alimentação 500"

Quanto mais detalhes você der, melhor eu classifico!

👆 Agora volte ao app e clique em "Já enviei o código" para acessar seu dashboard!`);
      } else {
        await ctx.reply('❌ Código inválido ou expirado. Verifique no app e tente novamente.');
      }
      return;
    }

    if (!supabaseUserId) {
      return ctx.reply('❌ Sua conta não está vinculada ou houve um erro na sincronização.\n\nAcesse "Ajustes > Vincular Telegram" no app e tente novamente. 🍐');
    }

    // --- AGUARDAR LIMITE DO CARTÃO (cadastro em andamento) ---
    const regPending = pendingCardRegistration.get(supabaseUserId);
    if (regPending && regPending.step === 'limit') {
      const limitValue = parseFloat(text.replace(',', '.'));
      if (isNaN(limitValue) || limitValue <= 0) {
        return ctx.reply('⚠️ Valor inválido. Envie apenas o número, ex: 5000');
      }

      const { data: newCard, error: cardError } = await supabase
        .from('credit_cards')
        .insert({
          user_id: supabaseUserId,
          name: regPending.bank,
          bank: regPending.bank,
          card_limit: limitValue,
          closing_day: regPending.closing_day,
          due_day: regPending.due_day
        })
        .select()
        .single();

      if (cardError) {
        pendingCardRegistration.delete(supabaseUserId);
        return ctx.reply(`❌ Erro ao cadastrar cartão: ${cardError.message}`);
      }

      if (regPending.fromInstallment) {
        const instPending = pendingInstallmentSetup.get(supabaseUserId);
        if (instPending) {
          const { item, shortCode, startThisMonth } = instPending;
          const instValue = item.value / item.installment_count;

          const insertData: any = {
            user_id: supabaseUserId,
            description: item.description,
            total_value: item.value,
            installment_value: instValue,
            total_installments: item.installment_count,
            current_installment: 0,
            category: item.category || 'Outros',
            short_code: shortCode,
            credit_card_id: newCard.id
          };

          const { error } = await supabase.from('installments').insert(insertData);
          pendingInstallmentSetup.delete(supabaseUserId);
          pendingCardRegistration.delete(supabaseUserId);

          if (error) {
            return ctx.reply(`❌ Erro ao registrar parcelamento: ${error.message}`);
          }

          return ctx.reply(
            `✅ Cartão ${regPending.bank} cadastrado e parcelamento registrado! #${shortCode}\n📝 ${item.description}\n💰 Total: R$ ${Number(item.value).toFixed(2)}\n📆 ${item.installment_count}x de R$ ${Number(instValue).toFixed(2)}\n💳 ${regPending.bank}\n📅 Início: ${startThisMonth ? 'este mês' : 'próximo mês'}`
          );
        }
      }

      await registerCreditTransaction(
        supabaseUserId, regPending.item, regPending.shortCode,
        newCard.id, newCard.closing_day, newCard.due_day
      );

      pendingCardRegistration.delete(supabaseUserId);

      const subcatLine = regPending.item.subcategory ? ` | ${regPending.item.subcategory}` : '';
      return ctx.reply(`✅ Cartão ${regPending.bank} cadastrado e transação registrada! #${regPending.shortCode}
💰 R$ ${Number(regPending.item.value).toFixed(2)}
📂 ${regPending.item.category}${subcatLine}
📝 ${regPending.item.description}
💳 ${regPending.bank} (crédito)`);
    }

    // STEP bank — usuário digita o nome do banco
    if (regPending && regPending.step === 'bank') {
      const BANK_NAMES = ['Nubank', 'Itaú', 'Bradesco', 'Inter',
        'C6 Bank', 'Santander', 'Caixa', 'Banco do Brasil', 'XP', 'BTG'];
      const bankInput = text.trim();
      const matchedBank = BANK_NAMES.find(b =>
        b.toLowerCase() === bankInput.toLowerCase() ||
        b.toLowerCase().includes(bankInput.toLowerCase()) ||
        bankInput.toLowerCase().includes(b.toLowerCase())
      );
      const bank = matchedBank || bankInput;
      pendingCardRegistration.set(supabaseUserId, {
        ...regPending, bank, step: 'closing_day'
      });
      return ctx.reply(
        `💳 Banco: ${bank}\n\nQual é o dia de fechamento da fatura? (digite só o número, ex: 12)`
      );
    }

    // STEP closing_day — usuário digita o dia de fechamento
    if (regPending && regPending.step === 'closing_day') {
      const day = parseInt(text.trim());
      if (isNaN(day) || day < 1 || day > 31) {
        return ctx.reply('⚠️ Dia inválido. Digite um número entre 1 e 31.');
      }
      pendingCardRegistration.set(supabaseUserId, {
        ...regPending, closing_day: day, step: 'due_day'
      });
      return ctx.reply(
        `💳 Banco: ${regPending.bank}\n📅 Fechamento: dia ${day}\n\nQual é o dia de vencimento? (digite só o número, ex: 20)`
      );
    }

    // STEP due_day — usuário digita o dia de vencimento
    if (regPending && regPending.step === 'due_day') {
      const day = parseInt(text.trim());
      if (isNaN(day) || day < 1 || day > 31) {
        return ctx.reply('⚠️ Dia inválido. Digite um número entre 1 e 31.');
      }
      pendingCardRegistration.set(supabaseUserId, {
        ...regPending, due_day: day, step: 'limit'
      });
      return ctx.reply(
        `💳 Banco: ${regPending.bank}\n📅 Fechamento: dia ${regPending.closing_day} | Vencimento: dia ${day}\n\n💰 Qual é o limite do cartão? (ex: 5000)`
      );
    }

    // --- EDIÇÃO DE ITEM DA NOTA FISCAL ---
    const receiptPending = pendingReceiptReview.get(supabaseUserId);
    if (receiptPending?.editingItemId) {
      const itemId = receiptPending.editingItemId;
      const item = receiptPending.items.find((i: any) => i.id === itemId);
      if (!item) {
        receiptPending.editingItemId = undefined;
        pendingReceiptReview.set(supabaseUserId, receiptPending);
        return ctx.reply('❌ Item não encontrado.');
      }

      const CATEGORIES_RECEIPT = ['Alimentação', 'Transporte', 'Saúde', 'Lazer',
        'Educação', 'Contas', 'Vestuário', 'Eletrônicos', 'Dízimo/Oferta', 'Outros'];
      const SUBCATEGORIES_RECEIPT = ['Mercado', 'Padaria', 'Fast Food', 'Delivery',
        'Restaurante', 'Lanchonete', 'Cafeteria', 'Doces', 'Petiscos',
        'Farmácia', 'Médico', 'Academia', 'Exames',
        'Uber/Táxi', 'Combustível', 'Transporte Público'];

      const numValue = parseFloat(text.replace(',', '.'));
      const textLower = text.trim().toLowerCase();

      if (!isNaN(numValue) && numValue > 0) {
        item.value = numValue;
      } else {
        const matchedCat = CATEGORIES_RECEIPT.find(c =>
          c.toLowerCase() === textLower || c.toLowerCase().includes(textLower)
        );
        const matchedSub = SUBCATEGORIES_RECEIPT.find(s =>
          s.toLowerCase() === textLower || s.toLowerCase().includes(textLower)
        );
        if (matchedCat) {
          item.category = matchedCat;
          item.subcategory = undefined;
        } else if (matchedSub) {
          item.subcategory = matchedSub;
        } else {
          item.description = text.trim();
        }
      }

      receiptPending.editingItemId = undefined;
      pendingReceiptReview.set(supabaseUserId, receiptPending);
      await ctx.reply('✅ Item atualizado!');
      await sendReceiptReview(ctx, supabaseUserId, receiptPending.items, receiptPending.paymentMethod);
      return;
    }

    const billValuePending = pendingBillValue.get(supabaseUserId);
    if (billValuePending && billValuePending.supabaseUserId === supabaseUserId) {
      const value = parseFloat(text.replace(',', '.'));
      if (isNaN(value) || value <= 0) {
        return ctx.reply('⚠️ Valor inválido. Digite apenas o número, ex: 87,50');
      }

      const { bill } = billValuePending;
      pendingBillValue.delete(supabaseUserId);

      // Processar pagamento com o valor informado
      const shortCode = bill.short_code || generateShortCode();

      if (!bill.short_code) {
        await supabase.from('monthly_bills')
          .update({ short_code: shortCode })
          .eq('id', bill.id);
      }

      await supabase.from('monthly_bills')
        .update({ paid: true, paid_at: new Date().toISOString(), value })
        .eq('id', bill.id);

      // Atualizar fixed_expenses com o novo valor (referência próximo mês)
      const { data: fixedExpenses } = await supabase
        .from('fixed_expenses').select('*')
        .eq('user_id', supabaseUserId).eq('active', true);
      const keywords = bill.name.toLowerCase().split(' ')
        .filter((w: string) => w.length > 2);
      const matchedFixed = fixedExpenses?.find(f =>
        keywords.some((kw: string) => f.name.toLowerCase().includes(kw))
      );
      if (matchedFixed) {
        await supabase.from('fixed_expenses')
          .update({ value })
          .eq('id', matchedFixed.id);
      }

      // Criar transação
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: supabaseUserId,
        value,
        type: 'expense',
        category: bill.category || 'Contas',
        subtype: sanitizeSubtype('fixed'),
        urgency: 'necessity',
        description: bill.name,
        source: 'text',
        short_code: shortCode
      });

      if (txError) {
        console.error('[BILL VALUE] Erro:', txError);
        return ctx.reply(`⚠️ Erro ao registrar: ${txError.message}`);
      }

      return ctx.reply(`✅ Conta paga! #${shortCode}\n📝 ${bill.name}\n💰 R$ ${value.toFixed(2)}\n📅 Valor atualizado para o próximo mês`);
    }

    // --- CORREÇÃO RÁPIDA DE DIA DE VENCIMENTO (Regex) ---
    // Padrões: #CODE 10 dia ou #CODE dia 10
    const dayRegex1 = /^#?(?:id)?([a-zA-Z0-9]{4})\s+(\d{1,2})\s+dia$/i;
    const dayRegex2 = /^#?(?:id)?([a-zA-Z0-9]{4})\s+dia\s+(\d{1,2})$/i;
    const dayMatch = text.match(dayRegex1) || text.match(dayRegex2);

    if (dayMatch) {
      const code = dayMatch[1].toUpperCase();
      const newDay = parseInt(dayMatch[2], 10);

      if (isNaN(newDay) || newDay < 1 || newDay > 31) {
        return ctx.reply('⚠️ Dia inválido. Use um número entre 1 e 31.');
      }

      const { data: updated, error } = await supabase
        .from('monthly_bills')
        .update({ due_day: newDay })
        .eq('short_code', code)
        .eq('user_id', supabaseUserId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!updated) return ctx.reply(`❓ Não encontrei nenhuma conta com o código #${code}.`);

      return ctx.reply(`✅ #${code} atualizado! Novo vencimento: dia ${newDay}. 🍐`);
    }

    const replyMsg = ctx.message.reply_to_message;
    if (replyMsg && replyMsg.text && supabaseUserId) {
      const codeMatch = replyMsg.text.match(/#(id[a-zA-Z0-9]{4})/i);
      if (codeMatch) {
        const replyCode = codeMatch[1];

        const { data: tData } = await supabase.from("transactions").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        const { data: iData } = await supabase.from("installments").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        const { data: bData } = await supabase.from("monthly_bills").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        const { data: tpData } = await supabase.from("tithe_payments").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();

        const record = tData || iData || bData || tpData;
        const table = tData ? "transactions" : (iData ? "installments" : (bData ? "monthly_bills" : (tpData ? "tithe_payments" : null)));

        const SUBCAT_TO_CAT: Record<string, { category: string, subcategory: string }> = {
          'mercado': { category: 'Alimentação', subcategory: 'Mercado' },
          'padaria': { category: 'Alimentação', subcategory: 'Padaria' },
          'delivery': { category: 'Lazer', subcategory: 'Delivery' },
          'restaurante': { category: 'Lazer', subcategory: 'Restaurante' },
          'lanchonete': { category: 'Lazer', subcategory: 'Lanchonete' },
          'cafeteria': { category: 'Lazer', subcategory: 'Cafeteria' },
          'fast food': { category: 'Lazer', subcategory: 'Fast Food' },
          'doces': { category: 'Lazer', subcategory: 'Doces' },
          'farmácia': { category: 'Saúde', subcategory: 'Farmácia' },
          'médico': { category: 'Saúde', subcategory: 'Médico' },
          'academia': { category: 'Saúde', subcategory: 'Academia' },
          'exames': { category: 'Saúde', subcategory: 'Exames' },
          'uber': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          'táxi': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          'taxi': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          'combustível': { category: 'Transporte', subcategory: 'Combustível' },
          'ônibus': { category: 'Transporte', subcategory: 'Transporte Público' },
          '99': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          '99pop': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          'pop99': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          '99 pop': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          'pop 99': { category: 'Transporte', subcategory: 'Uber/Táxi' },
          'cabify': { category: 'Transporte', subcategory: 'Uber/Táxi' },
        };

        const textLower = text.toLowerCase().trim();
        if (SUBCAT_TO_CAT[textLower] && record && table) {
          const mapped = SUBCAT_TO_CAT[textLower];
          const updates = {
            category: mapped.category,
            subcategory: mapped.subcategory
          };
          await supabase.from(table).update(updates).eq("short_code", replyCode);
          return ctx.reply(`✏️ #${replyCode} atualizado!\n📂 categoria: ${record.category} → ${mapped.category} | ${mapped.subcategory}`);
        }

        const result = await fetchGemini(geminiKey, {
          contents: [{ parts: [{ text: CORRECTION_PROMPT + text }] }]
        });
        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/```json|```/g, "") || "";
        const aiData = JSON.parse(aiText);

        if (record && table) {
          if (aiData.delete === true) {
            await supabase.from(table).delete().eq("id", record.id);

            // Cascading Deletions
            if (table === 'transactions') {
              // Resetar monthly_bill se existir com esse short_code
              await supabase.from('monthly_bills')
                .update({ paid: false, paid_at: null })
                .eq('short_code', record.short_code)
                .eq('user_id', supabaseUserId);
              // Delete tithe payment if linked
              if (record.category === 'Dízimo/Oferta') {
                await supabase.from('tithe_payments').delete().eq('short_code', record.short_code).eq('user_id', supabaseUserId);
              }
            } else if (table === 'monthly_bills') {
              // Delete linked transaction
              await supabase.from('transactions').delete().eq('short_code', record.short_code).eq('user_id', supabaseUserId);
            } else if (table === 'tithe_payments') {
              // Delete linked transaction
              await supabase.from('transactions').delete().eq('short_code', record.short_code).eq('user_id', supabaseUserId);
            }

            // Atualizar fatura do cartão se era transação de crédito
            if (table === 'transactions' && record.payment_method === 'credit'
              && record.credit_card_id && record.billing_month) {
              const { data: ccBill } = await supabase
                .from('credit_card_bills')
                .select('id, amount')
                .eq('credit_card_id', record.credit_card_id)
                .eq('billing_month', record.billing_month)
                .maybeSingle();

              if (ccBill) {
                const newAmount = Number(ccBill.amount) - Number(record.value);
                if (newAmount <= 0) {
                  await supabase.from('credit_card_bills').delete().eq('id', ccBill.id);
                } else {
                  await supabase.from('credit_card_bills').update({ amount: newAmount }).eq('id', ccBill.id);
                }
              }
            }

            return ctx.reply(`🗑️ Transação #${replyCode} apagada.`);
          }

          const updates: any = {};
          if (aiData.value !== null && aiData.value !== undefined) updates.value = aiData.value;
          if (aiData.description !== null && aiData.description !== undefined) {
            if (table === 'monthly_bills') updates.name = aiData.description;
            else updates.description = aiData.description;
          }
          if (aiData.category !== null && aiData.category !== undefined) updates.category = aiData.category;
          if (aiData.subtype !== null && aiData.subtype !== undefined) updates.subtype = aiData.subtype;
          if (aiData.urgency !== null && aiData.urgency !== undefined && table !== 'monthly_bills') updates.urgency = aiData.urgency;

          if (Object.keys(updates).length > 0) {
            const fieldLabels: Record<string, string> = {
              value: 'valor',
              description: 'descrição',
              name: 'descrição',
              category: 'categoria',
              subcategory: 'subcategoria',
              subtype: 'tipo',
              urgency: 'urgência',
              type: 'tipo de transação'
            };
            const urgencyLabels: Record<string, string> = {
              urgent: 'urgente',
              necessity: 'necessidade',
              secondary: 'secundário'
            };
            const subtypeLabels: Record<string, string> = {
              fixed: 'fixo',
              semifixed: 'parcelado',
              unique: 'único'
            };
            const formatValue = (field: string, val: any) => {
              if (field === 'urgency') return urgencyLabels[val] || val;
              if (field === 'subtype') return subtypeLabels[val] || val;
              if (field === 'value') return `R$ ${Number(val).toFixed(2)}`;
              return val;
            };

            const changes = Object.entries(updates)
              .filter(([k]) => !['user_id', 'occurred_at'].includes(k))
              .map(([k, v]) => {
                const label = fieldLabels[k] || k;
                const oldVal = formatValue(k, (record as any)[k]);
                const newVal = formatValue(k, v);
                return `${label}: ${oldVal} → ${newVal}`;
              })
              .join('\n');

            await supabase.from(table).update(updates).eq("short_code", replyCode);

            // Cascading Updates
            if (table === 'monthly_bills' && updates.value !== undefined) {
              await supabase.from('transactions').update({ value: updates.value }).eq('short_code', replyCode).eq('user_id', supabaseUserId);

              if (record.subtype === 'fixed') {
                const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', supabaseUserId).eq('active', true);
                const keywords = (record.name || '').toLowerCase().split(' ').filter((w: string) => w.length > 2);
                const matchedFixed = fixedExpenses?.find(f => keywords.some((kw: string) => f.name.toLowerCase().includes(kw)));
                if (matchedFixed) {
                  await supabase.from('fixed_expenses').update({ value: updates.value }).eq('id', matchedFixed.id);
                }
              }
            } else if (table === 'transactions' && updates.value !== undefined) {
              await supabase.from('monthly_bills').update({ value: updates.value }).eq('short_code', replyCode).eq('user_id', supabaseUserId);
            }

            await ctx.reply(`✅ #${record.short_code} atualizado!\n${changes}`);
            return;
          } else {
            return ctx.reply(`🤔 Não entendi o que alterar. Tente: "foi 90", "deletar", "categoria Saúde"`);
          }
        } else {
          return ctx.reply(`❓ Não encontrei a transação #${replyCode} no seu histórico.`);
        }
      }
    }

    // 1. RECONHECIMENTO DE COMANDOS (IA-Driven)
    const cmdRegex = /^(#?id[a-zA-Z0-9]{4}|#[a-zA-Z0-9]{4,6}|[a-zA-Z][a-zA-Z0-9]{3}|[a-zA-Z0-9]{3}[a-zA-Z])(\s+.*|$)/i;
    const cmdMatch = text.match(cmdRegex);

    if (cmdMatch) {
      console.log("Tipo detectado: comando/correção (IA)");
      const code = cmdMatch[1].replace('#', '');

      const result = await fetchGemini(geminiKey, {
        contents: [{ parts: [{ text: CORRECTION_PROMPT + text }] }]
      });
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/```json|```/g, "") || "";
      const aiData = JSON.parse(aiText);

      // --- Localizar registro em todas as tabelas ---
      const { data: tData } = await supabase.from("transactions").select("*").ilike("short_code", code).eq("user_id", supabaseUserId).maybeSingle();
      const { data: iData } = await supabase.from("installments").select("*").ilike("short_code", code).eq("user_id", supabaseUserId).maybeSingle();
      const { data: bData } = await supabase.from("monthly_bills").select("*").ilike("short_code", code).eq("user_id", supabaseUserId).maybeSingle();
      const { data: tpData } = await supabase.from("tithe_payments").select("*").ilike("short_code", code).eq("user_id", supabaseUserId).maybeSingle();

      const record = tData || iData || bData || tpData;
      const table = tData ? "transactions" : (iData ? "installments" : (bData ? "monthly_bills" : (tpData ? "tithe_payments" : null)));

      if (!record || !table) {
        return ctx.reply(`❌ Não encontrei nenhuma transação com o código #${code}.

Possíveis motivos:
- O código pode estar errado — confere na mensagem de confirmação
- A transação pode já ter sido apagada

💡 Dica: o código aparece em destaque na mensagem de registro, ex: #idAOAV`);
      }

      // --- Caso: APAGAR ---
      if (aiData.delete === true) {
        await supabase.from(table).delete().eq("id", record.id);

        // Cascading Deletions
        if (table === 'transactions') {
          // Resetar monthly_bill se existir com esse short_code
          await supabase.from('monthly_bills')
            .update({ paid: false, paid_at: null })
            .eq('short_code', record.short_code)
            .eq('user_id', supabaseUserId);
          // Delete tithe payment if linked
          if (record.category === 'Dízimo/Oferta') {
            await supabase.from('tithe_payments').delete().eq('short_code', record.short_code).eq('user_id', supabaseUserId);
          }
        } else if (table === 'monthly_bills') {
          // Delete linked transaction
          await supabase.from('transactions').delete().eq('short_code', record.short_code).eq('user_id', supabaseUserId);
        } else if (table === 'tithe_payments') {
          // Delete linked transaction
          await supabase.from('transactions').delete().eq('short_code', record.short_code).eq('user_id', supabaseUserId);
        }

        // Atualizar fatura do cartão se era transação de crédito
        if (table === 'transactions' && record.payment_method === 'credit'
          && record.credit_card_id && record.billing_month) {
          const { data: ccBill } = await supabase
            .from('credit_card_bills')
            .select('id, amount')
            .eq('credit_card_id', record.credit_card_id)
            .eq('billing_month', record.billing_month)
            .maybeSingle();

          if (ccBill) {
            const newAmount = Number(ccBill.amount) - Number(record.value);
            if (newAmount <= 0) {
              await supabase.from('credit_card_bills').delete().eq('id', ccBill.id);
            } else {
              await supabase.from('credit_card_bills').update({ amount: newAmount }).eq('id', ccBill.id);
            }
          }
        }

        return ctx.reply(`🗑️ Transação #${code} apagada.`);
      }

      // --- Caso: CORRIGIR ---
      const updates: any = {};
      const changeLogs: string[] = [];

      if (aiData.value !== null && aiData.value !== undefined) updates.value = aiData.value;
      if (aiData.description !== null && aiData.description !== undefined) {
        if (table === 'monthly_bills') updates.name = aiData.description;
        else updates.description = aiData.description;
      }
      const CATS_WITH_SUBCATEGORY = ['Alimentação', 'Lazer', 'Saúde', 'Transporte'];
      if (aiData.category !== null && aiData.category !== undefined) {
        updates.category = aiData.category;
        if (!CATS_WITH_SUBCATEGORY.includes(aiData.category)) {
          updates.subcategory = null;
        }
      }
      if (aiData.subtype !== null && aiData.subtype !== undefined) updates.subtype = aiData.subtype;
      if (aiData.urgency !== null && aiData.urgency !== undefined && table !== 'monthly_bills') updates.urgency = aiData.urgency;

      // --- Lógica Especial: Conversão ou Alteração de Parcelamento ---
      if (aiData.installments !== null) {
        const totalInstallments = aiData.installments;

        if (table === "transactions") {
          const finalValue = updates.value !== undefined ? updates.value : record.value;
          const instValue = finalValue / totalInstallments;

          const { error: insErr } = await supabase.from("installments").insert({
            user_id: supabaseUserId,
            description: updates.description || record.description,
            total_value: finalValue,
            installment_value: instValue,
            total_installments: totalInstallments,
            category: (updates.category || record.category) || 'Outros',
            short_code: code
          });

          if (insErr) throw insErr;
          await supabase.from("transactions").delete().eq("id", record.id);

          return ctx.reply(`🔄 Convertido para parcelamento! #${code}
📝 ${updates.description || record.description}
💰 Total: R$ ${Number(finalValue).toFixed(2)}
📆 ${totalInstallments}x de R$ ${Number(instValue).toFixed(2)}`);

        } else if (table === "installments") {
          const finalTotalValue = updates.value !== undefined ? updates.value : record.total_value;
          const newInstValue = finalTotalValue / totalInstallments;

          updates.total_installments = totalInstallments;
          updates.installment_value = newInstValue;
          changeLogs.push(`📆 parcelas: ${record.total_installments}x → ${totalInstallments}x de R$ ${Number(newInstValue).toFixed(2)}`);
        }
      }

      if (Object.keys(updates).length === 0) {
        return ctx.reply(`🤔 Encontrei a transação #${code} mas não entendi o que alterar.

O que você pode mudar:
- Valor → '#${code} foi 90'
- Tipo → '#${code} agora é fixo'
- Urgência → '#${code} é urgente'
- Descrição → '#${code} chama Almoço'
- Categoria → '#${code} categoria Saúde'
- Parcelas → '#${code} parcelar 3x'
- Apagar → '#${code} deletar'`);
      }

      // Gerar Logs e Aplicar
      if (updates.value !== undefined && (table === "transactions" || table === "monthly_bills")) changeLogs.push(`💰 valor: R$ ${record.value || 0} → R$ ${updates.value}`);
      if (updates.value !== undefined && table === "installments" && aiData.installments === null) changeLogs.push(`💰 total: R$ ${record.total_value} → R$ ${updates.value}`);
      if (updates.urgency !== undefined) changeLogs.push(`urgência: ${record.urgency} → ${updates.urgency}`);
      if (updates.subtype !== undefined) changeLogs.push(`🏷️ tipo: ${record.subtype} → ${updates.subtype}`);
      if (updates.category !== undefined) changeLogs.push(`📂 categoria: ${record.category} → ${updates.category}`);
      if (updates.description !== undefined) changeLogs.push(`📝 descrição: ${record.description} → ${updates.description}`);
      if (updates.name !== undefined) changeLogs.push(`📝 nome: ${record.name} → ${updates.name}`);

      const { error: updateErr } = await supabase.from(table).update(updates).eq("short_code", code);
      if (updateErr) throw updateErr;

      // Cascading Updates
      if (table === 'monthly_bills' && updates.value !== undefined) {
        await supabase.from('transactions').update({ value: updates.value }).eq('short_code', code).eq('user_id', supabaseUserId);

        if (record.subtype === 'fixed') {
          const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', supabaseUserId).eq('active', true);
          const keywords = (record.name || '').toLowerCase().split(' ').filter((w: string) => w.length > 2);
          const matchedFixed = fixedExpenses?.find(f => keywords.some((kw: string) => f.name.toLowerCase().includes(kw)));
          if (matchedFixed) {
            await supabase.from('fixed_expenses').update({ value: updates.value }).eq('id', matchedFixed.id);
          }
        }
      } else if (table === 'transactions' && updates.value !== undefined) {
        await supabase.from('monthly_bills').update({ value: updates.value }).eq('short_code', code).eq('user_id', supabaseUserId);
      }

      return ctx.reply(`✅ #${code} atualizado! 🍐\n${changeLogs.join('\n')}`);
    }

    // 2a. DETECÇÃO DE MENSAGEM AMBÍGUA (verbo passado sem valor)
    const ambiguousResult = await fetchGemini(geminiKey, {
      contents: [{ parts: [{ text: AMBIGUOUS_PROMPT + text }] }]
    }).catch(() => null);
    if (ambiguousResult) {
      const ambiguousText = ambiguousResult.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim().replace(/```json|```/g, "") || "";
      try {
        const ambiguousData = JSON.parse(ambiguousText);
        if (ambiguousData.is_ambiguous) {
          const verb = ambiguousData.verb_infinitive || 'comprar';
          const product = ambiguousData.product || 'item';
          return ctx.reply(`⚠️ Não consegui identificar o que você quis dizer.\n\nSe foi uma transação, reenvie incluindo o valor:\n- "${verb} ${product}" → ex: "2,29 ${product}" ou "gastei 2,29 em ${product}"\n\nSe quiser adicionar à lista de compras, use o infinitivo ou só o nome:\n- "${verb} ${product}" ou apenas "${product}"`);
        }
      } catch (e) {
        // não era ambíguo, continuar
      }
    }

    // 2b. DETECÇÃO DE LISTA DE COMPRAS
    const shoppingResult = await fetchGemini(geminiKey, {
      contents: [{ parts: [{ text: SHOPPING_PROMPT + text }] }]
    }).catch(() => null);
    if (shoppingResult) {
      const shoppingText = shoppingResult.candidates?.[0]?.content?.parts?.[0]?.text
        ?.trim().replace(/```json|```/g, "") || "";
      try {
        const shoppingData = JSON.parse(shoppingText);
        if (shoppingData.is_shopping && shoppingData.items?.length > 0) {
          // Inserir todos os itens na tabela
          const inserts = shoppingData.items.map((item: string) => ({
            user_id: supabaseUserId,
            text: item,
            checked: false
          }));
          await supabase.from('shopping_list').insert(inserts);

          const itemsList = shoppingData.items.map((i: string) => `• ${i}`).join('\n');
          return ctx.reply(`🛒 Adicionado à lista de compras!\n\n${itemsList}\n\nVeja no app em Histórico > Lista de Compras`);
        }
      } catch (e) {
        // não era lista de compras, continuar
      }
    }

    // 2. PROCESSAMENTO FINANCEIRO COM GEMINI
    console.log("Tipo detectado: financeiro");
    const result = await fetchGemini(geminiKey, {
      contents: [{ parts: [{ text: SYSTEM_PROMPT + text }] }]
    });
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/```json|```/g, "") || "";

    if (!responseText) throw new Error("Resposta vazia do Gemini");

    const data = JSON.parse(responseText);

    if (data.error === "not_financial") {
      const lowerText = text.toLowerCase();
      let hint = "";

      if (lowerText.includes("dia") && !/\d+/.test(text)) {
        hint = "Parece que você quer cadastrar uma conta fixa, mas faltou o valor. Tente: 'photoshop 120 dia 20'";
      } else if (lowerText.includes("pagar") && !/\d+/.test(text)) {
        hint = "Para registrar um pagamento, inclua o valor. Tente: 'pagar photoshop 120'";
      } else {
        hint = `Não entendi essa mensagem como gasto ou receita. Sua mensagem foi: "${text}" — tente reformular incluindo valor e descrição.`;
      }

      return ctx.reply(`🍐 ${hint}

Exemplos que funcionam:
- 'gastei 45 no iFood'
- 'paguei 1500 de aluguel'
- 'recebi 3000 de salário'
- 'parcelei jaqueta 300 em 3x'
- 'dízimo 300'`);
    }

    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return ctx.reply("🍐 Não identifiquei nenhuma transação clara nessa mensagem.");

    for (const item of items) {
      const shortCode = generateShortCode();
      const urgencyLabel = item.urgency === 'urgent' ? '🔴 Urgente'
        : item.urgency === 'necessity' ? '🟢 Necessidade'
          : '🔵 Secundário';

      if (item.is_installment && item.installment_count > 1) {
        pendingInstallmentSetup.set(supabaseUserId, {
          item, shortCode
        });

        const keyboard = new InlineKeyboard()
          .text('📅 Este mês', 'inst_month_current')
          .text('📅 Próximo mês', 'inst_month_next');

        await ctx.reply(
          `🛍️ Parcelamento detectado!\n📝 ${item.description}\n💰 Total: R$ ${Number(item.value).toFixed(2)}\n📆 ${item.installment_count}x de R$ ${Number(item.value / item.installment_count).toFixed(2)}\n\nA primeira parcela vence neste mês ou no próximo?`,
          { reply_markup: keyboard }
        );
        continue;

      } else if (item.type === 'payment') {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // 1. BUSCA MAIS FLEXÍVEL DE CONTAS (Month Bills)
        const keywords = item.description.toLowerCase().split(' ')
          .filter(w => w.length > 2 && !['de', 'do', 'da', 'os', 'as', 'um', 'uma', 'the', 'para', 'com'].includes(w));

        // --- Lógica Especial: Dízimo ---
        if (isDizimo(item.description)) {
          const summary = await getTitheSummary(supabaseUserId);

          if (summary.length === 0) {
            return ctx.reply(`✅ Seu dízimo já está em dia! 🍐`);
          }

          const targetMonth = parseMonth(text);
          let selectedMonth = null;

          if (targetMonth) {
            selectedMonth = summary.find(m => m.month === targetMonth);
          }

          // Se só tem um mês pendente e o usuário não especificou outro mês
          if (summary.length === 1 && !selectedMonth) {
            selectedMonth = summary[0];
          }

          if (selectedMonth) {
            const shortCode = selectedMonth.short_code || generateShortCode();
            const valueToPay = item.value !== undefined ? item.value : selectedMonth.balance_due;

            await supabase.from('tithe_payments').insert({
              user_id: supabaseUserId,
              value: valueToPay,
              description: `Dízimo ${MONTH_NAMES_PT[selectedMonth.month - 1]} via Telegram`,
              short_code: shortCode,
              paid_at: new Date().toISOString()
            });

            await supabase.from('transactions').insert({
              user_id: supabaseUserId,
              value: valueToPay,
              type: 'expense',
              category: 'Dízimo/Oferta',
              subtype: sanitizeSubtype('fixed'),
              urgency: 'necessity',
              description: `Dízimo ${MONTH_NAMES_PT[selectedMonth.month - 1]}`,
              source: 'text',
              short_code: shortCode
            });

            return ctx.reply(`✅ Dízimo de ${MONTH_NAMES_PT[selectedMonth.month - 1]} registrado! #${shortCode}\n💰 R$ ${Number(valueToPay).toFixed(2)}`);
          } else {
            // Múltiplos meses ou mês específico não encontrado
            if (targetMonth && !selectedMonth) {
              return ctx.reply(`❓ Não encontrei dízimo pendente para o mês de ${MONTH_NAMES_PT[targetMonth - 1]}.`);
            }

            const keyboard = new InlineKeyboard();
            summary.forEach(m => {
              keyboard.text(`${MONTH_NAMES_PT[m.month - 1]} — R$ ${m.balance_due.toFixed(2)}`, `tithe_month_select_${m.key}`).row();
            });

            pendingTitheSelection.set(supabaseUserId, { item, supabaseUserId });

            return ctx.reply(`🙏 Você tem dízimos pendentes de mais de um mês. Qual deles você pagou?`, {
              reply_markup: keyboard
            });
          }
        }

        const { data: bills, error: findError } = await supabase
          .from("monthly_bills")
          .select("*")
          .eq("user_id", supabaseUserId)
          .eq("month", month)
          .eq("year", year)
          .eq("paid", false);

        if (findError) throw findError;

        const bill = bills?.find(b =>
          keywords.some(kw => b.name.toLowerCase().includes(kw))
        );

        if (bill) {
          // Verificar se conta tem valor variável e não foi informado valor
          const VARIABLE_CATEGORIES = ['água', 'agua', 'luz', 'energia',
            'internet', 'gás', 'gas', 'condomínio', 'condominio',
            'telefone', 'iptu', 'ipva'];

          const isVariableBill = bill.variable_value === true ||
            VARIABLE_CATEGORIES.some((cat: string) =>
              bill.name.toLowerCase().includes(cat)
            );

          if (isVariableBill && item.value === undefined) {
            // Perguntar o valor
            const previousValue = Number(bill.value || 0);
            pendingBillValue.set(supabaseUserId, { bill, supabaseUserId });

            const keyboard = new InlineKeyboard();
            if (previousValue > 0) {
              keyboard.text(
                `✅ Mesmo valor (R$ ${previousValue.toFixed(2)})`,
                `bill_value_same_${bill.id}`
              ).row();
            }
            keyboard.text('❌ Cancelar', 'bill_value_cancel');

            const prevLabel = previousValue > 0
              ? `\n\nMês anterior: *R$ ${previousValue.toFixed(2)}*`
              : '';

            await ctx.reply(
              `💡 A conta *${bill.name}* tem valor variável.${prevLabel}\n\nQual foi o valor este mês? (ex: 87,50)`,
              { parse_mode: 'Markdown', reply_markup: keyboard }
            );
            continue;
          }

          const finalValue = item.value !== undefined ? item.value : bill.value;

          const { error: payError } = await supabase
            .from("monthly_bills")
            .update({ paid: true, paid_at: new Date().toISOString(), value: finalValue })
            .eq("id", bill.id);

          if (payError) throw payError;

          const shortCode = bill.short_code || generateShortCode();

          if (!bill.short_code) {
            await supabase.from('monthly_bills')
              .update({ short_code: shortCode })
              .eq('id', bill.id);
          }

          if (item.value !== undefined && item.value !== bill.value && bill.subtype === 'fixed') {
            const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', supabaseUserId).eq('active', true);
            const matchedFixed = fixedExpenses?.find(f => keywords.some(kw => f.name.toLowerCase().includes(kw)));
            if (matchedFixed) {
              await supabase.from('fixed_expenses').update({ value: finalValue }).eq('id', matchedFixed.id);
            }
          }

          const { error: txError } = await supabase.from("transactions").insert({
            user_id: supabaseUserId,
            value: finalValue,
            type: 'expense',
            category: 'Contas',
            subtype: sanitizeSubtype('fixed'),
            urgency: 'necessity',
            description: bill.name,
            source: 'text',
            short_code: shortCode
          });

          if (txError) {
            console.error('[PAGAMENTO] Erro ao criar transação:', txError);
            return ctx.reply(`✅ Conta marcada como paga, mas houve um erro ao registrar a transação: ${txError.message}`);
          }

          await ctx.reply(`✅ Conta paga! #${shortCode}
📝 ${bill.name}
💰 R$ ${Number(finalValue).toFixed(2)}`);
        } else {
          // 2. BUSCA EM PARCELAMENTOS (INSTALLMENTS)
          const { data: installments, error: instError } = await supabase
            .from("installments")
            .select("*")
            .eq("user_id", supabaseUserId)
            .eq("active", true);

          if (instError) throw instError;

          const installment = installments?.find(inst =>
            keywords.length > 0 && keywords.some(kw => inst.description.toLowerCase().includes(kw))
          );

          if (installment) {
            const previousCount = installment.current_installment || 0;
            const currentCount = previousCount + 1;
            const isFinished = currentCount >= installment.total_installments;

            await supabase
              .from("installments")
              .update({
                current_installment: currentCount,
                active: !isFinished
              })
              .eq("id", installment.id);

            const shortCode = generateShortCode();
            const { error: txError } = await supabase.from("transactions").insert({
              user_id: supabaseUserId,
              value: installment.installment_value,
              type: 'expense',
              category: installment.category,
              subtype: sanitizeSubtype('semifixed'),
              urgency: 'necessity',
              description: isFinished
                ? `${installment.description} (Final)`
                : `${installment.description} (Parcela ${currentCount}/${installment.total_installments})`,
              source: 'text',
              short_code: shortCode
            });

            if (txError) {
              console.error('[PAGAMENTO] Erro ao criar transação (parcela):', txError);
              return ctx.reply(`✅ Parcela registrada como paga, mas houve um erro ao registrar a transação: ${txError.message}`);
            }

            if (isFinished) {
              await ctx.reply(`✅ Parcelamento quitado! 🎉
📝 ${installment.description}
💰 Total pago: R$ ${Number(installment.total_value).toFixed(2)}`);
            } else {
              await ctx.reply(`✅ Parcela ${currentCount}/${installment.total_installments} paga! #${shortCode}
📝 ${installment.description}
💰 R$ ${Number(installment.installment_value).toFixed(2)}`);
            }
          } else {
            await ctx.reply(`❓ Não encontrei nenhuma conta ou parcelamento pendente para "${item.description}".`);
          }
        }
      } else if (item.type === 'bill') {
        const now = new Date();
        const finalValue = item.value !== undefined ? item.value : 0;

        if (!item.due_day || item.due_day < 1 || item.due_day > 31) {
          // Não é uma conta fixa válida, tratar como expense normal
          await supabase.from('transactions').insert({
            user_id: supabaseUserId,
            value: item.value || 0,
            type: 'expense',
            category: item.category || 'Contas',
            subtype: 'unique',
            urgency: 'necessity',
            description: item.name || item.description || 'Conta',
            source: 'text',
            short_code: shortCode
          });
          await ctx.reply(`✅ Registrado! #${shortCode}\n💰 R$ ${Number(item.value || 0).toFixed(2)}\n📂 ${item.category || 'Contas'}\n📝 ${item.name || item.description || 'Conta'}`);
          continue;
        }

        await supabase.from('fixed_expenses').insert({
          user_id: supabaseUserId,
          name: item.name,
          value: finalValue,
          due_day: item.due_day,
          category: item.category || 'Contas',
          active: true
        });

        const { error } = await supabase.from('monthly_bills').insert({
          user_id: supabaseUserId,
          name: item.name,
          value: finalValue,
          due_day: item.due_day,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          paid: false,
          subtype: 'fixed',
          category: item.category || 'Contas',
          short_code: shortCode
        });

        if (error) throw error;

        await ctx.reply(`✅ Conta cadastrada! #${shortCode}
📝 ${item.name}
💰 R$ ${finalValue.toFixed(2)}
📅 Vence todo dia ${item.due_day} 🍐`);
      } else if (item.type === 'budget_limit') {
        const { data: existing } = await supabase
          .from('budgets')
          .select('id')
          .eq('user_id', supabaseUserId)
          .eq('category', item.category)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('budgets')
            .update({ monthly_limit: item.limit_value })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('budgets')
            .insert({
              user_id: supabaseUserId,
              category: item.category,
              monthly_limit: item.limit_value
            });
          if (error) throw error;
        }

        await ctx.reply(`✅ Limite de **${item.category}** atualizado para R$ ${Number(item.limit_value).toFixed(2)} 🍐`);
      } else {
        if (!item.value && item.value !== 0) {
          console.log(`[SKIP] Item sem valor ignorado: ${item.description}`);
          continue;
        }

        // Determinar método de pagamento
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('default_payment')
          .eq('user_id', supabaseUserId)
          .maybeSingle();

        const defaultPayment = userProfile?.default_payment || 'debit';
        const paymentMethod = item.payment_method || defaultPayment;

        if (paymentMethod === 'credit' && item.type === 'expense') {
          const { data: cards } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('user_id', supabaseUserId);

          if (!cards || cards.length === 0) {
            // Sem cartão — iniciar cadastro por texto
            pendingCardRegistration.set(supabaseUserId, {
              item,
              shortCode,
              step: 'bank'
            });

            const keyboard = new InlineKeyboard()
              .text('❌ Cancelar cadastro', 'reg_card_cancel');

            await ctx.reply(
              `💳 Você não tem cartão cadastrado ainda.\n\nVamos cadastrar agora! Qual é o nome do seu banco?\n\nEx: Nubank, Itaú, Bradesco, Inter...`,
              { reply_markup: keyboard }
            );
            continue;
          }

          if (cards.length === 1) {
            const card = cards[0];
            await registerCreditTransaction(
              supabaseUserId, item, shortCode,
              card.id, card.closing_day, card.due_day
            );
            const subcatLine = item.subcategory ? ` | ${item.subcategory}` : '';
            await ctx.reply(`✅ Registrado! #${shortCode}
💰 R$ ${Number(item.value).toFixed(2)}
📂 ${item.category}${subcatLine}
📝 ${item.description}
💳 ${card.bank} (crédito)`);
            continue;
          }

          // Múltiplos cartões
          pendingCardSelection.set(supabaseUserId, { item, shortCode, supabaseUserId });
          const keyboard = new InlineKeyboard();
          cards.forEach(card => {
            keyboard.text(`💳 ${card.bank}`, `card_select_${card.id}_${shortCode}`).row();
          });
          await ctx.reply(
            `💳 Em qual cartão foi essa compra?\n\n📝 ${item.description}\n💰 R$ ${Number(item.value).toFixed(2)}`,
            { reply_markup: keyboard }
          );
          continue;
        }

        const { error } = await supabase.from("transactions").insert({
          user_id: supabaseUserId,
          value: item.value,
          type: item.type,
          category: item.category || 'Outros',
          subtype: sanitizeSubtype(item.subtype || 'unique'),
          urgency: item.urgency || 'necessity',
          description: item.description || item.category || 'Sem descrição',
          source: 'text',
          short_code: shortCode,
          subcategory: item.subcategory || null
        });

        if (error) throw error;

        const subcatLine = item.subcategory ? ` | ${item.subcategory}` : '';

        if (item.type === 'income') {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('tithe_active')
            .eq('user_id', supabaseUserId)
            .maybeSingle();

          const titheIsActive = userProfile?.tithe_active !== false;

          if (titheIsActive) {
            const keyboard = new InlineKeyboard()
              .text('✅ Sim, conta para o dízimo', `tithe_yes_${shortCode}`)
              .text('❌ Não conta', `tithe_no_${shortCode}`);

            await ctx.reply(
              `✅ Receita registrada! #${shortCode}\n💰 R$ ${Number(item.value).toFixed(2)}\n📝 ${item.description || item.category || 'Sem descrição'}\n\n🙏 Essa entrada conta para o cálculo do dízimo?`,
              { reply_markup: keyboard }
            );
            continue;
          }
        }

        await ctx.reply(`✅ Registrado! #${shortCode}
💰 R$ ${Number(item.value).toFixed(2)}
📂 ${item.category}${subcatLine}
📝 ${item.description || item.category || 'Sem descrição'}
${urgencyLabel}`);
      }
    }

  } catch (error) {
    console.error("Erro no processamento:", error);
    ctx.reply(`⚠️ Algo deu errado ao processar sua mensagem.

O que você pode fazer:
- Tenta enviar a mensagem novamente
- Se o erro persistir, tenta reformular a mensagem

💡 Se estava tentando corrigir uma transação, confirma se o código está certo.`);
  }
});

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // STEP 1 — mês da primeira parcela
  if (data === 'inst_month_current' || data === 'inst_month_next') {
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingInstallmentSetup.get(supabaseUserId);
    if (!pending) return;

    pending.startThisMonth = data === 'inst_month_current';
    pendingInstallmentSetup.set(supabaseUserId, pending);

    // Buscar cartões
    const { data: cards } = await supabase
      .from('credit_cards').select('*')
      .eq('user_id', supabaseUserId);

    const keyboard = new InlineKeyboard();
    (cards || []).forEach(card => {
      keyboard.text(`💳 ${card.bank}`, `inst_card_${card.id}`).row();
    });
    keyboard.text('➕ Cadastrar novo cartão', 'inst_card_new').row();
    keyboard.text('🏦 Outros / Sem cartão', 'inst_card_none');

    await ctx.editMessageText(
      `📅 ${pending.startThisMonth ? 'Primeira parcela este mês' : 'Primeira parcela no próximo mês'}\n\nQual cartão foi utilizado?`
    );
    await ctx.reply('Selecione o cartão:', { reply_markup: keyboard });
  }

  if (data === 'inst_card_new') {
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingInstallmentSetup.get(supabaseUserId);
    if (!pending) return;

    // Iniciar cadastro de cartão, salvando contexto de parcelamento
    pendingCardRegistration.set(supabaseUserId, {
      step: 'bank',
      fromInstallment: true,
      installmentShortCode: pending.shortCode
    });

    await ctx.reply(
      `💳 Vamos cadastrar seu cartão!\n\nQual é o nome do seu banco?\n\nEx: Nubank, Itaú, Bradesco, Inter...`,
      { reply_markup: new InlineKeyboard().text('❌ Cancelar', 'reg_card_cancel') }
    );
    return;
  }

  // STEP 2 — cartão selecionado
  if (data.startsWith('inst_card_') && data !== 'inst_card_new') {
    await ctx.answerCallbackQuery();
    const cardId = data.replace('inst_card_', '');
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingInstallmentSetup.get(supabaseUserId);
    if (!pending) return;

    const { item, shortCode, startThisMonth } = pending;
    const instValue = item.value / item.installment_count;

    // Calcular start_date
    const now = new Date();
    const startDate = startThisMonth
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Inserir parcelamento
    const insertData: any = {
      user_id: supabaseUserId,
      description: item.description,
      total_value: item.value,
      installment_value: instValue,
      total_installments: item.installment_count,
      current_installment: 0,
      category: item.category || 'Outros',
      short_code: shortCode
    };

    if (cardId !== 'none') {
      insertData.credit_card_id = cardId;
    }

    const { error } = await supabase.from('installments').insert(insertData);
    if (error) {
      console.error('[PARCELA] Erro:', error);
      pendingInstallmentSetup.delete(supabaseUserId);
      return ctx.reply(`❌ Erro ao registrar parcelamento: ${error.message}`);
    }

    pendingInstallmentSetup.delete(supabaseUserId);

    let cardInfo = 'Sem cartão vinculado';
    if (cardId !== 'none') {
      const { data: card } = await supabase
        .from('credit_cards').select('bank')
        .eq('id', cardId).maybeSingle();
      if (card) cardInfo = `💳 ${card.bank}`;
    }

    await ctx.editMessageText(
      `✅ Parcelamento registrado! #${shortCode}\n📝 ${item.description}\n💰 Total: R$ ${Number(item.value).toFixed(2)}\n📆 ${item.installment_count}x de R$ ${Number(instValue).toFixed(2)}\n${cardInfo}\n📅 Início: ${startThisMonth ? 'este mês' : 'próximo mês'}`
    );
  }

  // Cancelar cadastro de cartão
  if (data === 'reg_card_cancel') {
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    if (profile?.user_id) pendingCardRegistration.delete(profile.user_id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('❌ Cadastro de cartão cancelado.');
  }

  if (data === 'bill_value_cancel') {
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    if (profile?.user_id) pendingBillValue.delete(profile.user_id);
    await ctx.editMessageText('❌ Pagamento cancelado.');
  }

  if (data.startsWith('bill_value_same_')) {
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingBillValue.get(supabaseUserId);
    if (!pending) return;

    const value = Number(pending.bill.value || 0);
    const { bill } = pending;
    pendingBillValue.delete(supabaseUserId);

    const shortCode = bill.short_code || generateShortCode();

    if (!bill.short_code) {
      await supabase.from('monthly_bills')
        .update({ short_code: shortCode })
        .eq('id', bill.id);
    }

    await supabase.from('monthly_bills')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', bill.id);

    const { error: txError } = await supabase.from('transactions').insert({
      user_id: supabaseUserId,
      value,
      type: 'expense',
      category: bill.category || 'Contas',
      subtype: 'fixed',
      urgency: 'necessity',
      description: bill.name,
      source: 'text',
      short_code: shortCode
    });

    if (txError) {
      return ctx.reply(`⚠️ Erro ao registrar: ${txError.message}`);
    }

    await ctx.editMessageText(
      `✅ Conta paga! #${shortCode}\n📝 ${bill.name}\n💰 R$ ${value.toFixed(2)}`
    );
  }

  // EDITAR item da nota fiscal
  if (data.startsWith('receipt_edit_')) {
    await ctx.answerCallbackQuery();
    const itemId = data.replace('receipt_edit_', '');
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingReceiptReview.get(supabaseUserId);
    if (!pending) return;
    const item = pending.items.find((i: any) => i.id === itemId);
    if (!item) return;
    pending.editingItemId = itemId;
    pendingReceiptReview.set(supabaseUserId, pending);
    await ctx.reply(
      `✏️ Editando: *${item.description}* (${item.value.toFixed(2)})\n\nEnvie:\n- Um número para alterar o valor (ex: 8.50)\n- Texto para alterar o nome\n- Uma categoria para alterar a categoria`,
      { parse_mode: 'Markdown' }
    );
  }

  // REMOVER item da nota fiscal
  if (data.startsWith('receipt_remove_')) {
    await ctx.answerCallbackQuery();
    const itemId = data.replace('receipt_remove_', '');
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingReceiptReview.get(supabaseUserId);
    if (!pending) return;
    pending.items = pending.items.filter((i: any) => i.id !== itemId);
    pendingReceiptReview.set(supabaseUserId, pending);
    if (pending.items.length === 0) {
      pendingReceiptReview.delete(supabaseUserId);
      await ctx.editMessageText('🗑️ Todos os itens foram removidos. Nota cancelada.');
      return;
    }
    await ctx.editMessageText('✅ Item removido.');
    await sendReceiptReview(ctx, supabaseUserId, pending.items, pending.paymentMethod);
  }

  // CONFIRMAR todos os itens da nota fiscal
  if (data === 'receipt_confirm') {
    await ctx.answerCallbackQuery();
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id, default_payment')
      .eq('telegram_id', userId).maybeSingle();
    const supabaseUserId = profile?.user_id;
    const pending = pendingReceiptReview.get(supabaseUserId);
    if (!pending) return;
    await ctx.editMessageText('⏳ Registrando itens...');
    let registered = 0;
    let errors = 0;
    const registeredMessages: string[] = [];

    for (const item of pending.items) {
      const shortCode = generateShortCode();
      try {
        if (pending.paymentMethod === 'credit') {
          const { data: cards } = await supabase
            .from('credit_cards').select('*')
            .eq('user_id', supabaseUserId);
          if (cards && cards.length === 1) {
            await registerCreditTransaction(
              supabaseUserId,
              { ...item, type: 'expense' },
              shortCode,
              cards[0].id,
              cards[0].closing_day,
              cards[0].due_day
            );
            const subcatLine = item.subcategory ? ` | ${item.subcategory}` : '';
            registeredMessages.push(`✅ Registrado! #${shortCode}\n💰 R$ ${Number(item.value).toFixed(2)}\n📂 ${item.category}${subcatLine}\n📝 ${item.description}\n🟢 Necessidade\n💳 ${cards[0].bank} (crédito)`);
            registered++;
            continue;
          }
        }

        const { error: txError } = await supabase.from('transactions').insert({
          user_id: supabaseUserId,
          value: item.value,
          type: 'expense',
          category: item.category || 'Outros',
          subtype: sanitizeSubtype('unique'),
          urgency: 'necessity',
          description: item.description,
          source: 'text',
          short_code: shortCode,
          subcategory: item.subcategory || null,
          payment_method: pending.paymentMethod || 'debit'
        });

        if (txError) {
          console.error('[NOTA] Erro ao inserir transação:', txError);
          errors++;
          continue;
        }

        const subcatLine = item.subcategory ? ` | ${item.subcategory}` : '';
        registeredMessages.push(`✅ Registrado! #${shortCode}\n💰 R$ ${Number(item.value).toFixed(2)}\n📂 ${item.category}${subcatLine}\n📝 ${item.description}\n🟢 Necessidade`);
        registered++;

      } catch (e) {
        console.error('[NOTA] Erro ao registrar item:', e);
        errors++;
      }
    }

    pendingReceiptReview.delete(supabaseUserId);

    for (const msg of registeredMessages) {
      await ctx.reply(msg);
    }

    const fmt = (n: number) => `R$ ${Number(n).toFixed(2)}`;
    const total = pending.items.reduce((s: number, i: any) => s + i.value, 0);
    await ctx.reply(
      `🧾 ${registered} ${registered === 1 ? 'item registrado' : 'itens registrados'}!\n💰 Total: ${fmt(total)}${errors > 0 ? `\n⚠️ ${errors} erro(s) — verifique os logs` : ''}`
    );
  }

  // CANCELAR nota fiscal
  if (data === 'receipt_cancel') {
    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles').select('user_id')
      .eq('telegram_id', userId).maybeSingle();
    if (profile?.user_id) pendingReceiptReview.delete(profile.user_id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('❌ Nota fiscal cancelada.');
  }

  if (data.startsWith('card_select_')) {
    const parts = data.replace('card_select_', '').split('_');
    const cardId = parts[0];
    const shortCode = parts.slice(1).join('_');

    const userId = ctx.from.id.toString();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('telegram_id', userId)
      .maybeSingle();
    const supabaseUserId = profile?.user_id;

    if (!supabaseUserId) {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText('❌ Usuário não encontrado.');
    }

    const pending = pendingCardSelection.get(supabaseUserId);
    if (!pending) {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText('⚠️ Seleção expirada. Tente registrar novamente.');
    }

    const { data: card } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .maybeSingle();

    if (!card) {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText('❌ Cartão não encontrado.');
    }

    await registerCreditTransaction(
      supabaseUserId, pending.item, pending.shortCode,
      card.id, card.closing_day, card.due_day
    );

    pendingCardSelection.delete(supabaseUserId);

    const subcatLine = pending.item.subcategory ? ` | ${pending.item.subcategory}` : '';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`✅ Registrado! #${pending.shortCode}
💰 R$ ${Number(pending.item.value).toFixed(2)}
📂 ${pending.item.category}${subcatLine}
📝 ${pending.item.description}
💳 ${card.bank} (crédito)`);
  }

  if (data.startsWith('tithe_yes_') || data.startsWith('tithe_no_')) {
    const shortCode = data.replace('tithe_yes_', '').replace('tithe_no_', '');
    const countsForTithe = data.startsWith('tithe_yes_');

    await supabase
      .from('transactions')
      .update({ counts_for_tithe: countsForTithe })
      .eq('short_code', shortCode);

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text?.split('\n\n')[0] || '✅ Receita atualizada') +
      `\n\n${countsForTithe ? '✅ Conta para o dízimo' : '❌ Não conta para o dízimo'}`
    );
  }

  if (data.startsWith('tithe_month_select_')) {
    const monthKey = data.replace('tithe_month_select_', ''); // Format: YYYY-MM
    const userId = ctx.from.id.toString();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('telegram_id', userId)
      .maybeSingle();
    const supabaseUserId = profile?.user_id;

    if (!supabaseUserId) {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText('❌ Usuário não encontrado.');
    }

    const pending = pendingTitheSelection.get(supabaseUserId);
    if (!pending) {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText('⚠️ Seleção expirada. Tente novamente.');
    }

    const summary = await getTitheSummary(supabaseUserId);
    const selectedMonth = summary.find(m => m.key === monthKey);

    if (!selectedMonth) {
      await ctx.answerCallbackQuery();
      return ctx.editMessageText('❌ Mês não encontrado ou já pago.');
    }

    const shortCode = generateShortCode();
    const valueToPay = pending.item.value !== undefined ? pending.item.value : selectedMonth.balance_due;

    await supabase.from('tithe_payments').insert({
      user_id: supabaseUserId,
      value: valueToPay,
      description: `Dízimo ${MONTH_NAMES_PT[selectedMonth.month - 1]} via Telegram`,
      short_code: shortCode,
      paid_at: new Date().toISOString()
    });

    await supabase.from('transactions').insert({
      user_id: supabaseUserId,
      value: valueToPay,
      type: 'expense',
      category: 'Dízimo/Oferta',
      subtype: sanitizeSubtype('fixed'),
      urgency: 'necessity',
      description: `Dízimo ${MONTH_NAMES_PT[selectedMonth.month - 1]}`,
      source: 'text',
      short_code: shortCode
    });

    pendingTitheSelection.delete(supabaseUserId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`✅ Dízimo de ${MONTH_NAMES_PT[selectedMonth.month - 1]} registrado! #${shortCode}\n💰 R$ ${Number(valueToPay).toFixed(2)}`);
  }
});

const port = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor HTTP rodando na porta ${port}`);
});

async function startBot(attempts = 0) {
  try {
    await bot.start();
  } catch (err: any) {
    if (err?.error_code === 409) {
      const delay = Math.min(5000 * (attempts + 1), 30000);
      console.log(`Conflito 409, tentando novamente em ${delay}ms...`);
      setTimeout(() => startBot(attempts + 1), delay);
    } else {
      console.error('Erro fatal no bot:', err);
      process.exit(1);
    }
  }
}

startBot();
console.log("Bot Pera iniciando...");
