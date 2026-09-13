#!/usr/bin/env node
// Generates src/integrations/supabase/types.ts from a Postgres database that has the migrations
// applied (for example the local test database built by scripts/test-db.sh), in the same shape as
// `supabase gen types typescript`.
//
//   PSQL=psql PGPORT=54329 PGDATABASE=rw_test_legacy node scripts/gen-db-types.mjs > src/integrations/supabase/types.ts

import { execFileSync } from "node:child_process";

const psql = process.env.PSQL ?? "psql";
const args = [
  "-h", process.env.PGHOST ?? "127.0.0.1",
  "-p", process.env.PGPORT ?? "5432",
  "-U", process.env.PGUSER ?? "postgres",
  "-d", process.env.PGDATABASE ?? "postgres",
  "-tA", "-c",
];
const query = (sql) => JSON.parse(execFileSync(psql, [...args, sql], { encoding: "utf8" }).trim() || "[]");

const columns = query(`
  SELECT COALESCE(json_agg(c ORDER BY c.table_name, c.column_name), '[]') FROM (
    SELECT c.table_name, c.column_name, c.is_nullable = 'YES' AS nullable,
           c.column_default IS NOT NULL OR c.is_identity = 'YES' AS has_default,
           c.data_type, c.udt_name,
           (SELECT e.data_type FROM information_schema.element_types e
             WHERE e.object_schema = c.table_schema AND e.object_name = c.table_name
               AND e.collection_type_identifier = c.dtd_identifier) AS element_type,
           t.table_type
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
  ) c`);

const relationships = query(`
  SELECT COALESCE(json_agg(r ORDER BY r.table_name, r.name), '[]') FROM (
    SELECT con.conname AS name, cl.relname AS table_name,
           ARRAY(SELECT a.attname FROM unnest(con.conkey) k JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k) AS columns,
           rcl.relname AS referenced_table,
           ARRAY(SELECT a.attname FROM unnest(con.confkey) k JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k) AS referenced_columns,
           EXISTS (
             SELECT 1 FROM pg_constraint u WHERE u.conrelid = con.conrelid AND u.contype IN ('u', 'p') AND u.conkey = con.conkey
           ) AS one_to_one
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    JOIN pg_class rcl ON rcl.oid = con.confrelid
    JOIN pg_namespace rn ON rn.oid = rcl.relnamespace
    WHERE con.contype = 'f' AND n.nspname = 'public' AND rn.nspname = 'public'
  ) r`);

const functions = query(`
  SELECT COALESCE(json_agg(f ORDER BY f.name), '[]') FROM (
    SELECT p.proname AS name,
           COALESCE(p.proargnames, ARRAY[]::text[]) AS arg_names,
           ARRAY(SELECT format_type(t, NULL) FROM unnest(p.proargtypes) t) AS arg_types,
           p.pronargdefaults AS n_defaults,
           format_type(p.prorettype, NULL) AS return_type,
           p.proretset AS returns_set,
           rt.typtype AS return_typtype,
           rc.relname AS return_table
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type rt ON rt.oid = p.prorettype
    LEFT JOIN pg_class rc ON rc.oid = rt.typrelid AND rc.relkind = 'r'
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND format_type(p.prorettype, NULL) NOT IN ('trigger', 'event_trigger')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  ) f`);

const enums = query(`
  SELECT COALESCE(json_object_agg(t.typname, t.labels), '{}') FROM (
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' GROUP BY t.typname
  ) t`);

function scalar(type, udt) {
  if (enums[udt]) return `Database["public"]["Enums"]["${udt}"]`;
  switch (type) {
    case "uuid": case "text": case "character varying": case "character": case "citext":
    case "date": case "time without time zone": case "time with time zone":
    case "timestamp without time zone": case "timestamp with time zone": case "interval": case "inet":
      return "string";
    case "integer": case "bigint": case "smallint": case "numeric": case "real": case "double precision":
      return "number";
    case "boolean": return "boolean";
    case "json": case "jsonb": return "Json";
    default: return "unknown";
  }
}

function columnType(column) {
  if (column.data_type === "ARRAY") {
    const udt = column.udt_name.replace(/^_/, "");
    return `${scalar(column.element_type ?? udt, udt)}[]`;
  }
  if (column.data_type === "USER-DEFINED") return scalar(column.udt_name, column.udt_name);
  return scalar(column.data_type, column.udt_name);
}

function pgTypeToTs(type) {
  const base = type.replace(/\[\]$/, "");
  const ts = enums[base] ? `Database["public"]["Enums"]["${base}"]` : scalar(base === "timestamp with time zone" ? base : base, base);
  return type.endsWith("[]") ? `${ts}[]` : ts;
}

const tables = new Map();
const views = new Map();
for (const column of columns) {
  const target = column.table_type === "VIEW" ? views : tables;
  if (!target.has(column.table_name)) target.set(column.table_name, []);
  target.get(column.table_name).push(column);
}

const indent = (n) => "  ".repeat(n);
const out = [];
out.push("export type Json =", "  | string", "  | number", "  | boolean", "  | null", "  | { [key: string]: Json | undefined }", "  | Json[]", "");
out.push("export type Database = {", "  public: {", "    Tables: {");
for (const [name, cols] of [...tables.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`${indent(3)}${name}: {`);
  for (const [block, optional] of [["Row", null], ["Insert", "insert"], ["Update", "update"]]) {
    out.push(`${indent(4)}${block}: {`);
    for (const col of cols) {
      const type = `${columnType(col)}${col.nullable ? " | null" : ""}`;
      const opt = optional === "update" || (optional === "insert" && (col.nullable || col.has_default)) ? "?" : "";
      out.push(`${indent(5)}${col.column_name}${opt}: ${type}`);
    }
    out.push(`${indent(4)}}`);
  }
  const rels = relationships.filter((r) => r.table_name === name);
  out.push(`${indent(4)}Relationships: [`);
  for (const rel of rels) {
    out.push(
      `${indent(5)}{`,
      `${indent(6)}foreignKeyName: "${rel.name}"`,
      `${indent(6)}columns: [${rel.columns.map((c) => `"${c}"`).join(", ")}]`,
      `${indent(6)}isOneToOne: ${rel.one_to_one}`,
      `${indent(6)}referencedRelation: "${rel.referenced_table}"`,
      `${indent(6)}referencedColumns: [${rel.referenced_columns.map((c) => `"${c}"`).join(", ")}]`,
      `${indent(5)}},`,
    );
  }
  out.push(`${indent(4)}]`, `${indent(3)}}`);
}
out.push("    }", "    Views: {", "      [_ in never]: never", "    }", "    Functions: {");
const byName = new Map();
for (const fn of functions) if (!byName.has(fn.name)) byName.set(fn.name, fn);
for (const fn of [...byName.values()]) {
  out.push(`${indent(3)}${fn.name}: {`);
  if (fn.arg_types.length === 0) {
    out.push(`${indent(4)}Args: never`);
  } else {
    out.push(`${indent(4)}Args: {`);
    const firstDefault = fn.arg_types.length - fn.n_defaults;
    fn.arg_types.forEach((type, index) => {
      const argName = fn.arg_names[index] || `arg${index}`;
      out.push(`${indent(5)}${argName}${index >= firstDefault ? "?" : ""}: ${pgTypeToTs(type)}`);
    });
    out.push(`${indent(4)}}`);
  }
  let returns;
  if (fn.return_table) {
    returns = `Database["public"]["Tables"]["${fn.return_table}"]["Row"]${fn.returns_set ? "[]" : ""}`;
  } else {
    returns = `${fn.return_type === "void" ? "undefined" : pgTypeToTs(fn.return_type)}${fn.returns_set ? "[]" : ""}`;
  }
  out.push(`${indent(4)}Returns: ${returns}`);
  if (fn.return_table) {
    out.push(`${indent(4)}SetofOptions: {`, `${indent(5)}from: "*"`, `${indent(5)}to: "${fn.return_table}"`, `${indent(5)}isOneToOne: ${!fn.returns_set}`, `${indent(5)}isSetofReturn: ${fn.returns_set}`, `${indent(4)}}`);
  }
  out.push(`${indent(3)}}`);
}
out.push("    }", "    Enums: {");
for (const [name, labels] of Object.entries(enums).sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`${indent(3)}${name}: ${labels.map((l) => `"${l}"`).join(" | ")}`);
}
out.push("    }", "    CompositeTypes: {", "      [_ in never]: never", "    }", "  }", "}", "");

out.push(
  'type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">',
  'type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]',
  "",
  "export type Tables<T extends keyof DefaultSchema[\"Tables\"]> = DefaultSchema[\"Tables\"][T][\"Row\"]",
  "export type TablesInsert<T extends keyof DefaultSchema[\"Tables\"]> = DefaultSchema[\"Tables\"][T][\"Insert\"]",
  "export type TablesUpdate<T extends keyof DefaultSchema[\"Tables\"]> = DefaultSchema[\"Tables\"][T][\"Update\"]",
  "export type Enums<T extends keyof DefaultSchema[\"Enums\"]> = DefaultSchema[\"Enums\"][T]",
  "",
  "export const Constants = {",
  "  public: {",
  "    Enums: {",
  ...Object.entries(enums).sort(([a], [b]) => a.localeCompare(b)).map(([name, labels]) => `      ${name}: [${labels.map((l) => `"${l}"`).join(", ")}],`),
  "    },",
  "  },",
  "} as const",
  "",
);

process.stdout.write(out.join("\n"));
