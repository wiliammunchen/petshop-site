// Edge Function (Deno / Supabase Functions)
// Ajuste: certifique-se de definir as variáveis de ambiente no painel do Supabase:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
// Deploy com: supabase functions deploy restore-backup

import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DATABASE_URL = Deno.env.get("DATABASE_URL")!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error("Environment variables SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL are required.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });

    // 1) Verifica usuário via token
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("getUser error", userErr);
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }
    const user = userData.user;

    // 2) Confirma que é admin (ajuste o campo conforme sua tabela 'usuarios')
    // Aqui assumimos que você tem tabela 'usuarios' com coluna 'id' = auth user id e 'is_admin' boolean.
    const { data: adminCheck, error: adminErr } = await supabaseAdmin
      .from("usuarios")
      .select("id, is_admin")
      .eq("id", user.id)
      .single();

    if (adminErr || !adminCheck || !adminCheck.is_admin) {
      console.warn("User not admin or missing record", adminErr);
      return new Response(JSON.stringify({ error: "Forbidden. Administrator required." }), { status: 403 });
    }

    // 3) Parse request body
    const body = await req.json();
    const path = body?.path;
    if (!path) return new Response(JSON.stringify({ error: "Missing path in body" }), { status: 400 });

    // 4) Download file from storage (bucket 'backups')
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
      .from("backups")
      .download(path);

    if (downloadError) {
      console.error("Storage download error", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download backup file", detail: downloadError.message }), { status: 500 });
    }

    const downloadedArrayBuffer = await downloadData.arrayBuffer();
    const text = new TextDecoder().decode(downloadedArrayBuffer);
    let backupJson;
    try {
      backupJson = JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON in backup file", e);
      return new Response(JSON.stringify({ error: "Invalid JSON file" }), { status: 400 });
    }

    // 5) Connect to Postgres using DATABASE_URL and run restoration in order
    const client = new postgres.Client(DATABASE_URL);
    await client.connect();

    try {
      // Desativa checagens de FK temporariamente
      await client.queryArray("BEGIN;");
      await client.queryArray("SET session_replication_role = 'replica';");

      // Preferência: aplicar TRUNCATE ... CASCADE em todas as tabelas do backup
      // (reinicia sequence com RESTART IDENTITY)
      const tabelas = Object.keys(backupJson);

      // Truncate all tables found (CASCADE) - cuidado: destrutivo
      for (const tabela of tabelas) {
        const sqlTruncate = `TRUNCATE TABLE "${tabela}" RESTART IDENTITY CASCADE;`;
        await client.queryArray(sqlTruncate);
      }

      // Inserir dados tabela por tabela
      for (const tabela of tabelas) {
        const rows = backupJson[tabela];
        if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

        // Monta insert multi-row parametrizado
        // Pega colunas do primeiro objeto
        const columns = Object.keys(rows[0]);
        const colsSql = columns.map((c) => `"${c}"`).join(", ");

        // Monta placeholders e valores
        const values: unknown[] = [];
        const rowPlaceholders = rows.map((row, rowIndex) => {
          const ph = columns.map((col, colIndex) => {
            values.push(row[col] !== undefined ? row[col] : null);
            return `$${values.length}`;
          });
          return `(${ph.join(", ")})`;
        });

        const insertSql = `INSERT INTO "${tabela}" (${colsSql}) VALUES ${rowPlaceholders.join(", ")};`;
        await client.queryArray(insertSql, ...values);
      }

      // Restaura checagens
      await client.queryArray("SET session_replication_role = 'origin';");
      await client.queryArray("COMMIT;");

      await client.end();
      return new Response(JSON.stringify({ status: "ok", message: "Backup restored successfully." }), { status: 200 });

    } catch (err) {
      // tenta rollback e re-throw
      try {
        await client.queryArray("ROLLBACK;");
        await client.end();
      } catch (_) {}
      console.error("Restore error", err);
      return new Response(JSON.stringify({ error: "Restore failed", detail: String(err) }), { status: 500 });
    }

  } catch (e) {
    console.error("Unexpected error", e);
    return new Response(JSON.stringify({ error: "Unexpected server error", detail: String(e) }), { status: 500 });
  }
});