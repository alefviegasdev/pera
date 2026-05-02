// Script to update bot logic
const fs = require('fs');

let file = fs.readFileSync('c:/Users/Alef/Documents/Pera/packages/bot/src/index.ts', 'utf8');

// 1. Fix reply-to lookup
file = file.replace(
`        const { data: tData } = await supabase.from("transactions").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        const { data: iData } = await supabase.from("installments").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        
        const record = tData || iData;
        const table = tData ? "transactions" : (iData ? "installments" : null);`,
`        const { data: tData } = await supabase.from("transactions").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        const { data: iData } = await supabase.from("installments").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        const { data: bData } = await supabase.from("monthly_bills").select("*").ilike("short_code", replyCode).eq("user_id", supabaseUserId).maybeSingle();
        
        const record = tData || iData || bData;
        const table = tData ? "transactions" : (iData ? "installments" : (bData ? "monthly_bills" : null));`
);

// 2. Fix reply-to update mapping
file = file.replace(
`          const updates: any = {};
          if (aiData.value !== null) updates.value = aiData.value;
          if (aiData.description !== null) updates.description = aiData.description;
          if (aiData.category !== null) updates.category = aiData.category;
          if (aiData.subtype !== null) updates.subtype = aiData.subtype;
          if (aiData.urgency !== null) updates.urgency = aiData.urgency;
          
          if (Object.keys(updates).length > 0) {
            const changeSummary = Object.entries(updates)
              .map(([key, val]) => {
                if (key === 'value') return \`💰 valor: R$ \${Number(record.value).toFixed(2)} → R$ \${Number(val).toFixed(2)}\`;
                if (key === 'category') return \`📂 categoria: \${record.category} → \${val}\`;
                if (key === 'subcategory') return \`📌 subcategoria: \${record.subcategory || 'nenhuma'} → \${val}\`;
                if (key === 'description') return \`📝 descrição: \${record.description} → \${val}\`;
                if (key === 'subtype') return \`🏷️ tipo: \${record.subtype} → \${val}\`;
                if (key === 'urgency') return \`⏱️ urgência: \${record.urgency} → \${val}\`;
                return null;
              })
              .filter(Boolean)
              .join('\\n');
            await supabase.from(table).update(updates).eq("short_code", replyCode);
            return ctx.reply(\`✏️ #\${replyCode} atualizado!\\n\${changeSummary}\`);`,
`          const updates: any = {};
          if (aiData.value !== null) updates.value = aiData.value;
          if (aiData.description !== null) {
            if (table === 'monthly_bills') updates.name = aiData.description;
            else updates.description = aiData.description;
          }
          if (aiData.category !== null) updates.category = aiData.category;
          if (aiData.subtype !== null) updates.subtype = aiData.subtype;
          if (aiData.urgency !== null && table !== 'monthly_bills') updates.urgency = aiData.urgency;
          
          if (Object.keys(updates).length > 0) {
            const changeSummary = Object.entries(updates)
              .map(([key, val]) => {
                if (key === 'value') return \`💰 valor: R$ \${Number(record.value || 0).toFixed(2)} → R$ \${Number(val).toFixed(2)}\`;
                if (key === 'category') return \`📂 categoria: \${record.category} → \${val}\`;
                if (key === 'subcategory') return \`📌 subcategoria: \${record.subcategory || 'nenhuma'} → \${val}\`;
                if (key === 'description' || key === 'name') return \`📝 descrição: \${record.description || record.name} → \${val}\`;
                if (key === 'subtype') return \`🏷️ tipo: \${record.subtype} → \${val}\`;
                if (key === 'urgency') return \`⏱️ urgência: \${record.urgency} → \${val}\`;
                return null;
              })
              .filter(Boolean)
              .join('\\n');
            await supabase.from(table).update(updates).eq("short_code", replyCode);
            
            if (updates.value !== undefined && table === 'monthly_bills' && record.subtype === 'fixed') {
              const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', supabaseUserId).eq('active', true);
              const keywords = (record.name || '').toLowerCase().split(' ').filter((w: string) => w.length > 2);
              const matchedFixed = fixedExpenses?.find(f => keywords.some((kw: string) => f.name.toLowerCase().includes(kw)));
              if (matchedFixed) {
                 await supabase.from('fixed_expenses').update({ value: updates.value }).eq('id', matchedFixed.id);
              }
            }
            return ctx.reply(\`✏️ #\${replyCode} atualizado!\\n\${changeSummary}\`);`
);

// 3. Fix #idXXXX lookup
file = file.replace(
`      // --- Localizar registro em ambas as tabelas ---
      const { data: tData } = await supabase.from("transactions").select("*").eq("short_code", code).eq("user_id", supabaseUserId).single();
      const { data: iData } = await supabase.from("installments").select("*").eq("short_code", code).eq("user_id", supabaseUserId).single();

      const record = tData || iData;
      const table = tData ? "transactions" : (iData ? "installments" : null);`,
`      // --- Localizar registro em ambas as tabelas ---
      const { data: tData } = await supabase.from("transactions").select("*").eq("short_code", code).eq("user_id", supabaseUserId).maybeSingle();
      const { data: iData } = await supabase.from("installments").select("*").eq("short_code", code).eq("user_id", supabaseUserId).maybeSingle();
      const { data: bData } = await supabase.from("monthly_bills").select("*").eq("short_code", code).eq("user_id", supabaseUserId).maybeSingle();

      const record = tData || iData || bData;
      const table = tData ? "transactions" : (iData ? "installments" : (bData ? "monthly_bills" : null));`
);

// 4. Fix #idXXXX update variables
file = file.replace(
`      if (aiData.value !== null) updates.value = aiData.value;
      if (aiData.description !== null) updates.description = aiData.description;
      const CATS_WITH_SUBCATEGORY = ['Alimentação', 'Lazer', 'Saúde', 'Transporte'];
      if (aiData.category !== null) {
        updates.category = aiData.category;
        if (!CATS_WITH_SUBCATEGORY.includes(aiData.category)) {
          updates.subcategory = null;
        }
      }
      if (aiData.subtype !== null) updates.subtype = aiData.subtype;
      if (aiData.urgency !== null) updates.urgency = aiData.urgency;`,
`      if (aiData.value !== null) updates.value = aiData.value;
      if (aiData.description !== null) {
        if (table === 'monthly_bills') updates.name = aiData.description;
        else updates.description = aiData.description;
      }
      const CATS_WITH_SUBCATEGORY = ['Alimentação', 'Lazer', 'Saúde', 'Transporte'];
      if (aiData.category !== null) {
        updates.category = aiData.category;
        if (!CATS_WITH_SUBCATEGORY.includes(aiData.category)) {
          updates.subcategory = null;
        }
      }
      if (aiData.subtype !== null) updates.subtype = aiData.subtype;
      if (aiData.urgency !== null && table !== 'monthly_bills') updates.urgency = aiData.urgency;`
);

// 5. Fix #idXXXX changeLogs and applying updates
file = file.replace(
`      // Gerar Logs e Aplicar
      if (updates.value !== undefined && table === "transactions") changeLogs.push(\`💰 valor: R$ \${record.value} → R$ \${updates.value}\`);
      if (updates.value !== undefined && table === "installments" && aiData.installments === null) changeLogs.push(\`💰 total: R$ \${record.total_value} → R$ \${updates.value}\`);
      if (updates.urgency !== undefined) changeLogs.push(\`⏱️ urgência: \${record.urgency} → \${updates.urgency}\`);
      if (updates.subtype !== undefined) changeLogs.push(\`🏷️ tipo: \${record.subtype} → \${updates.subtype}\`);
      if (updates.category !== undefined) changeLogs.push(\`📂 categoria: \${record.category} → \${updates.category}\`);
      if (updates.description !== undefined) changeLogs.push(\`📝 descrição: \${record.description} → \${updates.description}\`);

      const { error: updateErr } = await supabase.from(table).update(updates).eq("short_code", code);
      if (updateErr) throw updateErr;

      return ctx.reply(\`✏️ #\${code} atualizado!\\n\${changeLogs.join('\\n')}\`);`,
`      // Gerar Logs e Aplicar
      if (updates.value !== undefined && (table === "transactions" || table === "monthly_bills")) changeLogs.push(\`💰 valor: R$ \${record.value || 0} → R$ \${updates.value}\`);
      if (updates.value !== undefined && table === "installments" && aiData.installments === null) changeLogs.push(\`💰 total: R$ \${record.total_value} → R$ \${updates.value}\`);
      if (updates.urgency !== undefined) changeLogs.push(\`⏱️ urgência: \${record.urgency} → \${updates.urgency}\`);
      if (updates.subtype !== undefined) changeLogs.push(\`🏷️ tipo: \${record.subtype} → \${updates.subtype}\`);
      if (updates.category !== undefined) changeLogs.push(\`📂 categoria: \${record.category} → \${updates.category}\`);
      if (updates.description !== undefined) changeLogs.push(\`📝 descrição: \${record.description} → \${updates.description}\`);
      if (updates.name !== undefined) changeLogs.push(\`📝 nome: \${record.name} → \${updates.name}\`);

      const { error: updateErr } = await supabase.from(table).update(updates).eq("short_code", code);
      if (updateErr) throw updateErr;

      if (updates.value !== undefined && table === 'monthly_bills' && record.subtype === 'fixed') {
        const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*').eq('user_id', supabaseUserId).eq('active', true);
        const keywords = (record.name || '').toLowerCase().split(' ').filter((w: string) => w.length > 2);
        const matchedFixed = fixedExpenses?.find(f => keywords.some((kw: string) => f.name.toLowerCase().includes(kw)));
        if (matchedFixed) {
           await supabase.from('fixed_expenses').update({ value: updates.value }).eq('id', matchedFixed.id);
        }
      }

      return ctx.reply(\`✏️ #\${code} atualizado!\\n\${changeLogs.join('\\n')}\`);`
);


// 6. Fix type: 'bill' insertion logic
file = file.replace(
`      } else if (item.type === 'bill') {
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

        await ctx.reply(\`✅ Conta cadastrada! #\${shortCode}
📝 \${item.name}
💰 R$ \${Number(item.value).toFixed(2)}
📅 Vence todo dia \${item.due_day} 🍐\`);`,
`      } else if (item.type === 'bill') {
        const now = new Date();
        const finalValue = item.value !== undefined ? item.value : 0;
        
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

        await ctx.reply(\`✅ Conta cadastrada! #\${shortCode}
📝 \${item.name}
💰 R$ \${finalValue.toFixed(2)}
📅 Vence todo dia \${item.due_day} 🍐\`);`
);

fs.writeFileSync('c:/Users/Alef/Documents/Pera/packages/bot/src/index.ts', file);
console.log("Transform applied successfully!");
