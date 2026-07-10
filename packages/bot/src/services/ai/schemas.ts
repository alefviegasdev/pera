import type { AIToolDefinition } from "./types";

const CATEGORIES = [
  "Alimentação", "Transporte", "Saúde", "Lazer", "Educação",
  "Contas", "Vestuário", "Eletrônicos", "Dízimo/Oferta", "Outros"
];

/**
 * Structured-output tool matching UNIFIED_PROMPT's response shapes.
 * `result` mirrors exactly what Gemini returns as raw JSON text today:
 * either a classification object (shopping/ambiguous/not_financial) or
 * an array of financial transactions.
 */
export const UNIFIED_TOOL: AIToolDefinition = {
  name: "classify_message",
  description:
    "Registra a classificação estruturada da mensagem do usuário, seguindo exatamente as regras e o formato JSON descritos no prompt.",
  resultKey: "result",
  inputSchema: {
    type: "object",
    properties: {
      result: {
        description: "Classificação da mensagem — um dos formatos definidos no prompt.",
        anyOf: [
          {
            type: "object",
            description: "Lista de compras (TIPO 1)",
            properties: {
              type: { const: "shopping" },
              items: { type: "array", items: { type: "string" } }
            },
            required: ["type", "items"]
          },
          {
            type: "object",
            description: "Mensagem ambígua (TIPO 2)",
            properties: {
              type: { const: "ambiguous" },
              verb: { type: "string" },
              product: { type: "string" }
            },
            required: ["type", "verb", "product"]
          },
          {
            type: "object",
            description: "Mensagem sem conteúdo financeiro",
            properties: {
              type: { const: "not_financial" }
            },
            required: ["type"]
          },
          {
            type: "array",
            description: "Uma ou mais transações financeiras (TIPO 3)",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["expense", "income", "payment", "bill", "budget_limit"] },
                value: { type: "number" },
                limit_value: { type: "number" },
                category: { type: "string", enum: CATEGORIES },
                subtype: { type: "string", enum: ["fixed", "semifixed", "unique"] },
                urgency: { type: "string", enum: ["urgent", "necessity", "secondary"] },
                description: { type: "string" },
                name: { type: "string" },
                due_day: { type: "number" },
                is_installment: { type: "boolean" },
                installment_count: { type: "number" },
                subcategory: { type: "string" },
                payment_method: { type: "string", enum: ["credit", "debit"] },
                variable_value: { type: "boolean" }
              },
              required: ["type"]
            }
          }
        ]
      }
    },
    required: ["result"]
  }
};

/**
 * Structured-output tool matching RECEIPT_PROMPT's response shape
 * (an array of extracted receipt items).
 */
export const RECEIPT_TOOL: AIToolDefinition = {
  name: "extract_receipt_items",
  description:
    "Registra os itens extraídos da nota fiscal, seguindo exatamente as regras e o formato JSON descritos no prompt.",
  resultKey: "items",
  inputSchema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            value: { type: "number" },
            category: { type: "string", enum: CATEGORIES },
            subcategory: { type: "string" },
            urgency: { type: "string", enum: ["urgent", "necessity", "secondary"] }
          },
          required: ["description", "value", "category", "urgency"]
        }
      }
    },
    required: ["items"]
  }
};
