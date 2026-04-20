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

if (!token || !geminiKey || !supabaseUrl || !supabaseKey) {
  throw new Error("Missing environment variables (TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, SUPABASE_URL, or SUPABASE_SECRET_KEY)");
}

const bot = new Bot(token);
const supabase = createClient(supabaseUrl, supabaseKey);
const pendingConfirmations = new Map<string, string>(); // Link confirmations
const ADMIN_TELEGRAM_ID = '5637235532'; // substituir pelo seu ID

const SYSTEM_PROMPT = `
Você é um assistente financeiro inteligente chamado Pera.
Sua tarefa é extrair informações financeiras de mensagens de texto e retornar SEMPRE um ARRAY de objetos JSON válidos.

REGRAS DE CLASSIFICAÇÃO:
1. "subtype":
   - "fixed": Despesas recorrentes obrigatórias sem prazo de fim (aluguel, internet, luz, água, dízimo, plano de saúde, condomínio).
   - "semifixed": Despesas recorrentes com prazo de fim ou temporárias (terapia, curso, parcelamentos, tratamentos, assinaturas temporárias).
   - "variable": Despesas pontuais sem recorrência (alimentação fora, lazer, compras avulsas).
2. "urgency":
   - "urgent": Emergências, imprevistos, saúde urgente.
   - "planned": Tudo que não é emergência (mesmo que recorrente ou obrigatório).
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
   
   A presença de "dia X" na mensagem é o sinal principal para type: "bill".

6. CATEGORIAS PADRONIZADAS (OBRIGATÓRIO):
   A categoria DEVE ser uma destas exatamente:
   - "Alimentação": mercado, padaria, pão, bolo, salgado, pão de queijo, coxinha, produtos de panificadora, hortifruti, açougue, rancho. IMPORTANTE: Qualquer compra em padaria = "Alimentação", independente do item. Só vai para "Fast Food" se for refeição completa consumida no local (almoço, jantar, hamburgueres, pizzas, cafeterias, restaurantes, etc).
   - "Fast Food": pizza, hambúrguer, lanchonete, cafeteria, sorvete, delivery, restaurante, bar.
   - "Transporte": uber, táxi, combustível, gasolina, estacionamento, ônibus, metrô, passagem.
   - "Saúde": farmácia, médico, plano de saúde, exames, hospital, academia, esportes, terapia.
   - "Lazer": cinema, streaming, netflix, spotify, jogos, viagem, entretenimento.
   - "Educação": curso, livro, school, faculdade, material escolar.
   - "Contas": luz, água, internet, aluguel, condomínio, telefone, gás, iptu, ipva.
   - "Vestuário": roupa, calçado, tênis, sapato, acessório, bolsa.
   - "Eletrônicos": celular, computador, notebook, tv, eletrodoméstico, gadget, fone.
   - "Dízimo/Oferta": dízimo, oferta, contribuição, doação para igreja.
   - "Outros": qualquer gasto que não se encaixe nas categorias acima.
   
   REGRA ESPECIAL PADARIA: ATENÇÃO: A palavra 'padaria' sozinha indica categoria 'Alimentação', não 'Fast Food'. Fast Food é apenas para restaurantes, lanchonetes, pizzarias e similares.

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

"Fast Food":
  - "Delivery": ifood, rappi, uber eats, pedido online, delivery
  - "Restaurante": restaurante, almoço, jantar, self-service, rodízio
  - "Lanchonete": hambúrguer, pizza, hot dog, lanche, burguer
  - "Cafeteria": café, starbucks, cafeteria, coffee, cappuccino

"Saúde":
  - "Farmácia": farmácia, remédio, medicamento, drogaria, droga raia
  - "Médico": médico, consulta, dentista, psicólogo, terapia, clínica
  - "Academia": academia, gym, crossfit, natação, musculação, esporte
  - "Exames": exame, laboratório, raio-x, ultrassom, hemograma

"Transporte":
  - "Uber/Táxi": uber, 99, táxi, cabify, corrida
  - "Combustível": gasolina, combustível, posto, etanol, abasteci
  - "Transporte Público": ônibus, metrô, passagem, bilhete único, trem

Para outras categorias (Lazer, Contas, Vestuário, etc.), não incluir subcategory.

JSON Structure (dentro do array):
{
  "value": número (decimal, se for expense/income),
  "limit_value": número (decimal, se for budget_limit),
  "type": "expense" | "income" | "payment" | "bill" | "budget_limit",
  "category": "Alimentação" | "Fast Food" | "Transporte" | "Saúde" | "Lazer" | "Educação" | "Contas" | "Vestuário" | "Eletrônicos" | "Dízimo/Oferta" | "Outros",
  "subtype": "fixed" | "semifixed" | "variable",
  "urgency": "urgent" | "planned",
  "description": string curta,
  "name": string (apenas se for type: bill),
  "due_day": número (apenas se for type: bill),
  "is_installment": boolean,
  "installment_count": número (opcional),
  "subcategory": string (opcional)
}

Se o usuário disser 'paguei [nome]', 'pagar [nome]', 'quitei [nome]' SEM mencionar valor, retorne type: 'payment' com description: nome do que foi pago. O sistema vai buscar o valor cadastrado automaticamente.

EXEMPLOS que devem retornar type: 'payment':
- 'paguei terapia' → { type: 'payment', description: 'terapia' }
- 'paguei a luz' → { type: 'payment', description: 'luz' }
- 'quitei o aluguel' → { type: 'payment', description: 'aluguel' }
- 'pagar academia' → { type: 'payment', description: 'academia' }

NÃO retorne not_financial para mensagens com 'paguei/pagar/quitei'.

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
  "urgency": "urgent", "planned" ou null,
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
- Se mencionar urgente/emergência/imprevisto → urgency: urgent
- Se mencionar não urgente/planejado/tranquilo → urgency: planned
- Se mencionar parcelas/vezes/dividir/x → preenche installments
- Se mencionar apagar/deletar/excluir/remover/cancelar → delete: true
- Retorna null nos campos não mencionados

Exemplos:
- "3" → { "value": 3, ... }
- "foi 90" → { "value": 90, ... }
- "deletar" → { "delete": true, ... }

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
        
        const record = tData || iData;
        const table = tData ? "transactions" : (iData ? "installments" : null);

        const SUBCAT_TO_CAT: Record<string, {category: string, subcategory: string}> = {
          'mercado': { category: 'Alimentação', subcategory: 'Mercado' },
          'padaria': { category: 'Alimentação', subcategory: 'Padaria' },
          'delivery': { category: 'Fast Food', subcategory: 'Delivery' },
          'restaurante': { category: 'Fast Food', subcategory: 'Restaurante' },
          'lanchonete': { category: 'Fast Food', subcategory: 'Lanchonete' },
          'cafeteria': { category: 'Fast Food', subcategory: 'Cafeteria' },
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
          return ctx.reply(`✏️ #${replyCode} atualizado!\n📂 categoria: ${record.category} → ${mapped.category}\n📌 subcategoria: ${mapped.subcategory}`);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: CORRECTION_PROMPT + text }] }]
          })
        });
        
        if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
        const result = await response.json();
        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/```json|```/g, "") || "";
        const aiData = JSON.parse(aiText);
        
        if (record && table) {
          if (aiData.delete === true) {
            await supabase.from(table).delete().eq("id", record.id);
            return ctx.reply(`🗑️ Transação #${replyCode} apagada.`);
          }
          
          const updates: any = {};
          if (aiData.value !== null) updates.value = aiData.value;
          if (aiData.description !== null) updates.description = aiData.description;
          if (aiData.category !== null) updates.category = aiData.category;
          if (aiData.subtype !== null) updates.subtype = aiData.subtype;
          if (aiData.urgency !== null) updates.urgency = aiData.urgency;
          
          if (Object.keys(updates).length > 0) {
            const changeSummary = Object.entries(updates)
              .map(([key, val]) => {
                if (key === 'value') return `💰 valor: R$ ${Number(record.value).toFixed(2)} → R$ ${Number(val).toFixed(2)}`;
                if (key === 'category') return `📂 categoria: ${record.category} → ${val}`;
                if (key === 'subcategory') return `📌 subcategoria: ${record.subcategory || 'nenhuma'} → ${val}`;
                if (key === 'description') return `📝 descrição: ${record.description} → ${val}`;
                if (key === 'subtype') return `🏷️ tipo: ${record.subtype} → ${val}`;
                if (key === 'urgency') return `⏱️ urgência: ${record.urgency} → ${val}`;
                return null;
              })
              .filter(Boolean)
              .join('\n');
            await supabase.from(table).update(updates).eq("short_code", replyCode);
            return ctx.reply(`✏️ #${replyCode} atualizado!\n${changeSummary}`);
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
      const code = cmdMatch[1].replace('#', '').toUpperCase();
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: CORRECTION_PROMPT + text }] }]
        })
      });

      if (!response.ok) throw new Error(`Gemini Correction Error: ${response.status}`);
      const result = await response.json();
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/```json|```/g, "") || "";
      const aiData = JSON.parse(aiText);

      // --- Localizar registro em ambas as tabelas ---
      const { data: tData } = await supabase.from("transactions").select("*").eq("short_code", code).eq("user_id", supabaseUserId).single();
      const { data: iData } = await supabase.from("installments").select("*").eq("short_code", code).eq("user_id", supabaseUserId).single();

      const record = tData || iData;
      const table = tData ? "transactions" : (iData ? "installments" : null);

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
        return ctx.reply(`🗑️ Transação #${code} apagada.`);
      }

      // --- Caso: CORRIGIR ---
      const updates: any = {};
      const changeLogs: string[] = [];

      if (aiData.value !== null) updates.value = aiData.value;
      if (aiData.description !== null) updates.description = aiData.description;
      const CATS_WITH_SUBCATEGORY = ['Alimentação', 'Fast Food', 'Saúde', 'Transporte'];
      if (aiData.category !== null) {
        updates.category = aiData.category;
        if (!CATS_WITH_SUBCATEGORY.includes(aiData.category)) {
          updates.subcategory = null;
        }
      }
      if (aiData.subtype !== null) updates.subtype = aiData.subtype;
      if (aiData.urgency !== null) updates.urgency = aiData.urgency;

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
      if (updates.value !== undefined && table === "transactions") changeLogs.push(`💰 valor: R$ ${record.value} → R$ ${updates.value}`);
      if (updates.value !== undefined && table === "installments" && aiData.installments === null) changeLogs.push(`💰 total: R$ ${record.total_value} → R$ ${updates.value}`);
      if (updates.urgency !== undefined) changeLogs.push(`⏱️ urgência: ${record.urgency} → ${updates.urgency}`);
      if (updates.subtype !== undefined) changeLogs.push(`🏷️ tipo: ${record.subtype} → ${updates.subtype}`);
      if (updates.category !== undefined) changeLogs.push(`📂 categoria: ${record.category} → ${updates.category}`);
      if (updates.description !== undefined) changeLogs.push(`📝 descrição: ${record.description} → ${updates.description}`);

      const { error: updateErr } = await supabase.from(table).update(updates).eq("short_code", code);
      if (updateErr) throw updateErr;

      return ctx.reply(`✏️ #${code} atualizado!\n${changeLogs.join('\n')}`);
    }

    // 2. PROCESSAMENTO FINANCEIRO COM GEMINI
    console.log("Tipo detectado: financeiro");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + text }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
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
      const urgencyLabel = item.urgency === 'urgent' ? 'Urgente' : 'Não urgente';
      const subtypeMap: any = { fixed: 'Fixo', variable: 'Variável', semifixed: 'Semi-fixo' };
      const subtypeLabel = subtypeMap[item.subtype] || 'Variável';

      if (item.is_installment && item.installment_count > 1) {
        const instValue = item.value / item.installment_count;
        
        const { error } = await supabase.from("installments").insert({
          user_id: supabaseUserId,
          description: item.description,
          total_value: item.value,
          installment_value: instValue,
          total_installments: item.installment_count,
          current_installment: 0,
          category: item.category || 'Outros',
          short_code: shortCode
        });

        if (error) throw error;

        await ctx.reply(`🛍️ Parcelamento registrado! #${shortCode}
📝 ${item.description}
💰 Total: R$ ${Number(item.value).toFixed(2)}
📆 ${item.installment_count}x de R$ ${Number(instValue).toFixed(2)}
📂 ${item.category}
⏱️ ${urgencyLabel}`);

      } else if (item.type === 'payment') {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // 1. BUSCA MAIS FLEXÍVEL DE CONTAS (Month Bills)
        const keywords = item.description.toLowerCase().split(' ')
          .filter(w => w.length > 2 && !['de', 'do', 'da', 'os', 'as', 'um', 'uma', 'the', 'para', 'com'].includes(w));

        // --- Lógica Especial: Dízimo ---
        if (item.description.toLowerCase().includes('dízimo') || item.description.toLowerCase().includes('oferta')) {
          const { data: budgetConfig } = await supabase
            .from('budgets')
            .select('monthly_limit')
            .eq('user_id', supabaseUserId)
            .eq('category', 'Dízimo/Oferta')
            .maybeSingle();

          let tithingValue = 0;
          if (budgetConfig?.monthly_limit) {
            tithingValue = Number(budgetConfig.monthly_limit);
          } else {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const { data: incomeTxs } = await supabase
              .from('transactions')
              .select('value')
              .eq('user_id', supabaseUserId)
              .eq('type', 'income')
              .gte('occurred_at', startOfMonth);
            
            const totalIncome = incomeTxs?.reduce((sum, tx) => sum + Number(tx.value), 0) || 0;
            tithingValue = totalIncome * 0.10;
          }

          const shortCode = generateShortCode();
          await supabase.from("transactions").insert({
            user_id: supabaseUserId,
            value: tithingValue,
            type: 'expense',
            category: 'Dízimo/Oferta',
            subtype: 'fixed',
            urgency: 'planned',
            description: 'Dízimo',
            source: 'text',
            short_code: shortCode
          });

          return ctx.reply(`✅ Dízimo registrado! #${shortCode}\n💰 R$ ${Number(tithingValue).toFixed(2)}`);
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
          const { error: payError } = await supabase
            .from("monthly_bills")
            .update({ paid: true, paid_at: new Date().toISOString() })
            .eq("id", bill.id);

          if (payError) throw payError;

          const shortCode = generateShortCode();
          await supabase.from("transactions").insert({
            user_id: supabaseUserId,
            value: bill.value,
            type: 'expense',
            category: 'Contas',
            subtype: 'fixed',
            urgency: 'planned',
            description: bill.name,
            source: 'text',
            short_code: shortCode
          });

          await ctx.reply(`✅ Conta paga! #${shortCode}
📝 ${bill.name}
💰 R$ ${Number(bill.value).toFixed(2)}`);
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
            await supabase.from("transactions").insert({
              user_id: supabaseUserId,
              value: installment.installment_value,
              type: 'expense',
              category: installment.category,
              subtype: 'semifixed',
              urgency: 'planned',
              description: isFinished 
                ? `${installment.description} (Final)` 
                : `${installment.description} (Parcela ${currentCount}/${installment.total_installments})`,
              source: 'text',
              short_code: shortCode
            });

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
        const { error } = await supabase.from('monthly_bills').insert({
          user_id: supabaseUserId,
          name: item.name,
          value: item.value,
          due_day: item.due_day,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          paid: false,
          short_code: shortCode
        });

        if (error) throw error;

        await ctx.reply(`✅ Conta cadastrada! #${shortCode}
📝 ${item.name}
💰 R$ ${Number(item.value).toFixed(2)}
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
        const { error } = await supabase.from("transactions").insert({
          user_id: supabaseUserId,
          value: item.value,
          type: item.type,
          category: item.category || 'Outros',
          subtype: item.subtype || 'variable',
          urgency: item.urgency || 'planned',
          description: item.description || item.category || 'Sem descrição',
          source: 'text',
          short_code: shortCode,
          subcategory: item.subcategory || null
        });

        if (error) throw error;

        const subcatLine = item.subcategory ? `\n📌 ${item.subcategory}` : '';

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
🏷️ ${subtypeLabel}
⏱️ ${urgencyLabel}`);
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
});

bot.start();
console.log("Bot Pera rodando (Direct API mode)!");

// Servidor HTTP mínimo para health check do Render
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(port, () => {
  console.log(`Servidor HTTP rodando na porta ${port} para health check`);
});
