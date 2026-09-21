#!/usr/bin/env node
// Read-only inventory of installed Agent Skills across agents. No dependencies, Node 18+.
//
// Usage:
//   node inventory.mjs [--summary | --issues | --skill <name>] [--text] [--cwd <dir>] [--home <dir>] [--dir <dir>]... [--only-dirs] [--pretty]
//
//   --summary      one short line per skill, long issue lists truncated (use for listing/recommending)
//   --issues       only problems, no skill list (use for health checks)
//   --skill <n>    full detail for one skill and the issues that mention it (plugin skills match "plugin:n" too)
//   --text         human-readable output instead of JSON (implies --summary unless --skill); good for terminals
//   --cwd          project folder whose .claude/.agents/... skill dirs are scanned (default: current dir)
//   --home         user home folder (default: os.homedir())
//   --dir          extra skills directory to scan (repeatable)
//   --only-dirs    scan only the --dir directories (useful for fixtures)
//   --pretty       indent the JSON output
//
// Default prints compact JSON: { scanned: { found, missing }, skills, issues, notes } with full descriptions.
// Skills may carry `origin` ("plugin" or "synced") and `similarTo` (overlap candidates, by wording).
// Never writes anything.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const PROJECT_DIRS = [
  { rel: '.agents/skills', agents: ['codex', 'cursor', 'opencode'] },
  { rel: '.claude/skills', agents: ['claude-code'] },
  { rel: '.cursor/skills', agents: ['cursor'] },
  { rel: '.opencode/skills', agents: ['opencode'] },
  { rel: '.windsurf/skills', agents: ['windsurf'] },
];

const USER_DIRS = [
  { rel: '.agents/skills', agents: ['shared'] },
  { rel: '.claude/skills', agents: ['claude-code'] },
  { rel: '.codex/skills', agents: ['codex'] },
  { rel: '.cursor/skills', agents: ['cursor'] },
  { rel: '.config/opencode/skills', agents: ['opencode'] },
  { rel: '.codeium/windsurf/skills', agents: ['windsurf'] },
];

// Installed plugins that bundle skills (<plugin>/.claude-plugin/plugin.json + <plugin>/skills/*/SKILL.md).
// `marketplaces` holds the catalogue of plugins you *could* install, not installed ones.
const PLUGIN_ROOTS = [{ rel: '.claude/plugins', agents: ['claude-code'], skip: ['marketplaces'], depth: 4 }];

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseArgs(argv) {
  const args = { cwd: process.cwd(), home: os.homedir(), dirs: [], onlyDirs: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd') args.cwd = argv[++i];
    else if (a === '--home') args.home = argv[++i];
    else if (a === '--dir') args.dirs.push(argv[++i]);
    else if (a === '--only-dirs') args.onlyDirs = true;
    else if (a === '--pretty') args.pretty = true;
    else if (a === '--summary') args.summary = true;
    else if (a === '--issues') args.issues = true;
    else if (a === '--skill') args.skill = argv[++i];
    else if (a === '--text') args.text = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node inventory.mjs [--summary | --issues | --skill <name>] [--text] [--cwd <dir>] [--home <dir>] [--dir <dir>]... [--only-dirs] [--pretty]');
      process.exit(0);
    }
  }
  return args;
}

const statSafe = (p) => { try { return fs.statSync(p); } catch { return null; } };
const lstatSafe = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const readDirSafe = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const isDir = (p) => !!statSafe(p)?.isDirectory();
const hasSkillMd = (p) => fs.existsSync(path.join(p, 'SKILL.md'));

function unquote(v) {
  const s = v.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

// Minimal YAML frontmatter reader: top-level scalars, block scalars (| >), one level of nested maps.
// Only the first block at the very top of the file counts.
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: null, body: text };

  const data = {};
  const lines = m[1].split(/\r?\n/);
  const indented = (l) => /^\s+\S/.test(l);

  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2];

    if (/^[|>][-+]?\s*$/.test(val)) {
      const parts = [];
      while (i + 1 < lines.length && (indented(lines[i + 1]) || lines[i + 1].trim() === '')) parts.push(lines[++i].trim());
      data[key] = val.startsWith('>') ? parts.join(' ').replace(/\s+/g, ' ').trim() : parts.join('\n').trim();
    } else if (val.trim() === '') {
      const children = {};
      while (i + 1 < lines.length && indented(lines[i + 1])) {
        const c = lines[++i].trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (c) children[c[1]] = unquote(c[2]);
      }
      data[key] = Object.keys(children).length ? children : '';
    } else {
      while (i + 1 < lines.length && indented(lines[i + 1])) val += ' ' + lines[++i].trim();
      data[key] = unquote(val);
    }
  }
  return { data, body: text.slice(m[0].length) };
}

// A wrapper is a tiny skill whose body just runs another skill (e.g. "Call the Skill tool with \"grilling\".").
function detectWrapper(body) {
  const b = body.trim();
  if (!b || b.length > 500) return null;
  const patterns = [
    /skill\s+tool\s+with\s+["'`]([a-z0-9-]+)["'`]/i,
    /(?:run|use|invoke|call|load|trigger)\s+(?:the\s+)?["'`]([a-z0-9-]+)["'`]\s+skill/i,
    /(?:run|use|invoke|call|load|trigger)\s+(?:the\s+)?skill\s+["'`]([a-z0-9-]+)["'`]/i,
  ];
  for (const re of patterns) {
    const hit = b.match(re);
    if (hit) return hit[1];
  }
  return null;
}

// First sentence of a description, capped, for compact listings.
function summarize(description, max = 140) {
  if (!description) return '';
  const first = (description.match(/^(.+?[.!?])(\s|$)/) || [null, description])[1];
  return first.length > max ? first.slice(0, max - 1).trimEnd() + '…' : first;
}

// ── Nested skills ─────────────────────────────────────────────────────────────

// Skill folders below `dir`, up to `depth` levels (category folders, account-synced bundles).
// A folder holding a manifest.json marks its skills as `synced` (e.g. skills synced from an account).
function findNestedSkills(dir, depth, synced = false) {
  if (depth <= 0) return [];
  const out = [];
  const inBundle = synced || fs.existsSync(path.join(dir, 'manifest.json'));
  for (const c of readDirSafe(dir)) {
    if (c.startsWith('.')) continue;
    const cp = path.join(dir, c);
    if (!isDir(cp)) continue;
    if (hasSkillMd(cp)) out.push({ dir: cp, synced: inBundle });
    else out.push(...findNestedSkills(cp, depth - 1, inBundle));
  }
  return out;
}

const DATA_FILE_RE = /\.(json|lock|ya?ml|toml|db|sqlite|log|cache|bin)$/i;

// Why a folder in a skills directory has no skill, so the agent can tell broken installs from harmless folders.
function describeFolder(p) {
  const entries = readDirSafe(p).filter((e) => !e.startsWith('.'));
  if (!entries.length) {
    return { severity: 'info', type: 'empty-folder', message: 'Empty folder in a skills directory; there is nothing to load.' };
  }
  if (findNestedSkills(p, 5).length) {
    return { severity: 'warning', type: 'skills-too-deep', message: 'Contains skills more than three levels below the skills directory; most agents will not find them.' };
  }
  const files = entries.filter((e) => statSafe(path.join(p, e))?.isFile());
  if (files.length === entries.length && files.every((f) => DATA_FILE_RE.test(f))) {
    return { severity: 'info', type: 'not-a-skill', message: "Only data/config files and no SKILL.md; probably another tool's folder, not a broken skill." };
  }
  return { severity: 'warning', type: 'no-skill-md', message: 'Folder in a skills directory without a SKILL.md; possibly a skill whose SKILL.md is missing or renamed.' };
}

// ── Plugins ───────────────────────────────────────────────────────────────────

function findPluginRoots(dir, depth, skip) {
  if (depth <= 0) return [];
  const out = [];
  for (const c of readDirSafe(dir)) {
    if (c.startsWith('.') || skip.includes(c)) continue;
    const cp = path.join(dir, c);
    if (!isDir(cp)) continue;
    if (fs.existsSync(path.join(cp, '.claude-plugin', 'plugin.json'))) out.push(cp);
    else out.push(...findPluginRoots(cp, depth - 1, skip));
  }
  return out;
}

function pluginInfo(root) {
  let json = {};
  try { json = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')); } catch { /* use fallbacks */ }
  const name = typeof json.name === 'string' && json.name.trim() ? json.name.trim() : path.basename(root);
  const version = typeof json.version === 'string' ? json.version : '';
  return { root, name, version, mtime: statSafe(root)?.mtimeMs ?? 0 };
}

// Newest first: highest version in plugin.json, then most recently modified folder.
function compareNewest(a, b) {
  const pa = a.version.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.version.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
  }
  return b.mtime - a.mtime;
}

// ── Overlaps ──────────────────────────────────────────────────────────────────
//
// Cheap lexical heuristic: TF-IDF cosine over names (counted twice) + descriptions. Words that are
// rare across the collection weigh more, so "review" or "frontend" pull two skills together while
// "code" or "engineering" barely count. It only proposes candidates for the redundancy mode; the
// agent still reads the SKILL.md bodies before calling anything a duplicate.

const STOP = new Set(`a an the and or of to for in on with without by from as at is are be been it its this that these those
your you user users agent agents skill skills use used uses using when whenever any all into can not no do does what which how
new more also only one eg etc like via about than then so if even their them they need needs want wants help helps before after
while where who why should would could may might must just every each other own out over under up down still yet same such
something anything instead rather make makes get gets give gives work works engineering development driven`.split(/\s+/));

const stem = (w) => (w.length > 5 ? w.replace(/(ations?|ings?|ers?|ed|es|s)$/, '') : w);

const words = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map(stem);

const SIMILAR_THRESHOLD = 0.15;

function computeSimilar(skills) {
  const shortName = (n) => n.split(':').pop();
  const docs = skills.map((s) => {
    const nameWords = words(shortName(s.name).replace(/-/g, ' '));
    const tf = new Map();
    for (const w of [...words(s.description), ...nameWords, ...nameWords]) tf.set(w, (tf.get(w) || 0) + 1);
    return { s, tf };
  });

  const df = new Map();
  for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) || 0) + 1);
  for (const d of docs) {
    d.vec = new Map();
    let norm = 0;
    for (const [w, c] of d.tf) {
      const x = (1 + Math.log(c)) * Math.log(1 + docs.length / df.get(w));
      d.vec.set(w, x);
      norm += x * x;
    }
    d.norm = Math.sqrt(norm) || 1;
  }

  for (const a of docs) {
    const scored = [];
    for (const b of docs) {
      const an = shortName(a.s.name);
      const bn = shortName(b.s.name);
      if (a === b || an === bn || a.s.wrapperOf === bn || b.s.wrapperOf === an) continue;
      let dot = 0;
      for (const [w, x] of a.vec) {
        const y = b.vec.get(w);
        if (y) dot += x * y;
      }
      const score = dot / (a.norm * b.norm);
      if (score >= SIMILAR_THRESHOLD) scored.push({ name: b.s.name, score });
    }
    scored.sort((x, y) => y.score - x.score);
    if (scored.length) a.s.similarTo = scored.slice(0, 3).map((x) => x.name);
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

function toText(result) {
  const out = [];
  if (result.notFound) out.push(`No skill named "${result.notFound}" found.`, '');
  if (result.skills) {
    out.push(`Skills (${result.skills.length})`);
    for (const s of result.skills) {
      const tags = [s.agents.join(', ')];
      if (s.origin) tags.push(s.origin);
      if (s.manualOnly) tags.push('manual only');
      if (s.wrapperOf) tags.push(`shortcut for ${s.wrapperOf}`);
      out.push(`  ${s.name}  [${tags.join(' · ')}]`);
      out.push(`    ${s.summary ?? s.description}`);
      if (s.similarTo) out.push(`    similar to: ${s.similarTo.join(', ')}`);
      if (s.locations) s.locations.forEach((l) => out.push(`    at ${l}`));
    }
    out.push('');
  }
  if (result.issues.length) {
    out.push('Issues');
    for (const g of result.issues) {
      const count = g.count ?? g.items.length;
      out.push(`  ${g.severity.toUpperCase()} ${g.type}${count > 1 ? ` (${count})` : ''}: ${g.message}`);
      for (const it of g.items) {
        if (it.paths) out.push(`    ${it.paths.join(' | ')}`);
        else if (it.path) out.push(`    ${it.path}${it.target ? ` -> ${it.target}${it.targetExists ? '' : ' (missing)'}` : ''}`);
        else if (it.name) out.push(`    ${it.name}`);
      }
      if (g.count > g.items.length) out.push(`    ... and ${g.count - g.items.length} more`);
    }
  } else {
    out.push('No issues found.');
  }
  if (result.notes?.length) out.push('', ...result.notes.map((n) => `Note: ${n}`));
  out.push('', `Scanned: ${result.scanned.found.map((d) => d.path).join(', ') || 'no skill directories found'}`);
  return out.join('\n');
}

function isTrue(v) {
  return v === true || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const home = path.resolve(args.home);
  const cwd = path.resolve(args.cwd);
  const pretty = (p) => (p.toLowerCase().startsWith(home.toLowerCase() + path.sep) ? '~' + p.slice(home.length).replace(/\\/g, '/') : p.replace(/\\/g, '/'));

  // Build the list of directories, merging agents when two conventions resolve to the same folder.
  const candidates = [];
  if (!args.onlyDirs) {
    for (const d of USER_DIRS) candidates.push({ abs: path.join(home, d.rel), scope: 'user', agents: d.agents });
    for (const d of PROJECT_DIRS) candidates.push({ abs: path.join(cwd, d.rel), scope: 'project', agents: d.agents });
  }
  for (const d of args.dirs) candidates.push({ abs: path.resolve(d), scope: 'custom', agents: ['custom'] });

  const dirMap = new Map();
  for (const c of candidates) {
    const key = c.abs.toLowerCase();
    if (dirMap.has(key)) {
      const existing = dirMap.get(key);
      existing.agents = [...new Set([...existing.agents, ...c.agents])];
    } else {
      dirMap.set(key, { ...c });
    }
  }

  const scanned = [];
  const found = []; // one entry per SKILL.md location
  const issues = [];

  const addSkill = (skillDir, dirInfo, { namespace, synced } = {}) => {
    const file = path.join(skillDir, 'SKILL.md');
    let raw;
    try { raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, ''); } catch { return; }
    const { data, body } = parseFrontmatter(raw);
    const folder = path.basename(skillDir);
    const loc = { path: pretty(skillDir), scope: dirInfo.scope, agents: dirInfo.agents };

    if (!data) {
      issues.push({ severity: 'error', type: 'no-frontmatter', path: pretty(file), message: 'SKILL.md has no YAML frontmatter at the top; agents may skip this skill.' });
    }
    const fm = data || {};
    const name = typeof fm.name === 'string' && fm.name.trim() ? fm.name.trim() : null;
    const description = typeof fm.description === 'string' ? fm.description.trim() : '';
    const manualOnly = isTrue(fm['disable-model-invocation']);

    if (data && !name) issues.push({ severity: 'error', type: 'missing-name', path: pretty(file), message: `No "name" field; using folder name "${folder}".` });
    if (name && name !== folder) issues.push({ severity: 'error', type: 'name-mismatch', path: pretty(file), message: `name "${name}" does not match folder "${folder}".` });
    if (name && (!NAME_RE.test(name) || name.length > 64)) issues.push({ severity: 'error', type: 'invalid-name', path: pretty(file), message: `name "${name}" must be 1-64 lowercase letters, digits and single hyphens.` });
    if (data && !description) issues.push({ severity: 'error', type: 'missing-description', path: pretty(file), message: 'No "description" field; agents cannot tell when to use this skill.' });
    if (description.length > 1024) issues.push({ severity: 'error', type: 'description-too-long', path: pretty(file), message: `description is ${description.length} characters (max 1024).` });
    if (description && !manualOnly && description.split(/\s+/).length < 10) {
      issues.push({ severity: 'info', type: 'weak-description', path: pretty(file), message: 'Very short description; the agent may rarely pick this skill on its own.' });
    }

    const base = name || folder;
    found.push({
      name: namespace ? `${namespace}:${base}` : base,
      description,
      manualOnly,
      wrapperOf: detectWrapper(body),
      origin: namespace ? 'plugin' : synced ? 'synced' : undefined,
      hash: crypto.createHash('sha1').update(raw).digest('hex'),
      location: loc,
    });
  };

  for (const dirInfo of dirMap.values()) {
    const st = statSafe(dirInfo.abs);
    const exists = !!st && st.isDirectory();
    scanned.push({ path: pretty(dirInfo.abs), scope: dirInfo.scope, agents: dirInfo.agents, exists });
    if (!exists) continue;

    for (const entry of readDirSafe(dirInfo.abs)) {
      if (entry.startsWith('.')) continue;
      const p = path.join(dirInfo.abs, entry);
      const lst = lstatSafe(p);
      const est = statSafe(p);

      if (lst && lst.isSymbolicLink() && !est) {
        issues.push({ severity: 'error', type: 'broken-link', path: pretty(p), message: 'Symlink points to a location that does not exist.' });
        continue;
      }
      if (!est) continue;

      if (est.isFile()) {
        if (est.size > 0 && est.size < 512) {
          const content = fs.readFileSync(p, 'utf8').trim();
          if (/^[\w.~:\/\\-]+$/.test(content) && /[\/\\]/.test(content)) {
            const target = path.resolve(dirInfo.abs, content);
            const targetOk = fs.existsSync(path.join(target, 'SKILL.md'));
            issues.push({
              severity: 'error',
              type: 'symlink-as-text',
              path: pretty(p),
              target: pretty(target),
              targetExists: targetOk,
              message: `Plain text file containing a path instead of a skill folder (a symlink checked out as text, common on Windows). The agent cannot load it.${targetOk ? ' The real skill exists at the target.' : ''}`,
            });
          }
        }
        continue;
      }

      if (!est.isDirectory()) continue;
      if (hasSkillMd(p)) {
        addSkill(p, dirInfo);
        continue;
      }
      // Two more levels (three below the skills dir), for category folders (skills/engineering/tdd) and synced bundles (synced/<id>/docx).
      const nested = findNestedSkills(p, 2);
      if (nested.length) nested.forEach((n) => addSkill(n.dir, dirInfo, { synced: n.synced }));
      else issues.push({ ...describeFolder(p), path: pretty(p) });
    }
  }

  // Plugin skills, named "<plugin>:<skill>" the way agents show them. Several cached versions of one
  // plugin are counted once (newest version wins), so upgrades do not look like name collisions.
  let pluginsFound = 0;
  if (!args.onlyDirs) {
    for (const pr of PLUGIN_ROOTS) {
      const abs = path.join(home, pr.rel);
      const roots = findPluginRoots(abs, pr.depth, pr.skip).map(pluginInfo).sort(compareNewest);
      const seen = new Set();
      const dirInfo = { scope: 'plugin', agents: pr.agents };
      for (const { root, name } of roots) {
        if (seen.has(name)) continue;
        seen.add(name);
        const skillsDir = path.join(root, 'skills');
        for (const c of readDirSafe(skillsDir)) {
          const cp = path.join(skillsDir, c);
          if (!c.startsWith('.') && isDir(cp) && hasSkillMd(cp)) {
            addSkill(cp, dirInfo, { namespace: name });
            pluginsFound++;
          }
        }
      }
      scanned.push({ path: pretty(abs), scope: 'plugin', agents: pr.agents, exists: pluginsFound > 0 });
    }
  }

  // Merge locations by name; same content = normal multi-location install, different content = collision.
  // Synced skills are kept apart: agents show them under their own prefix, so a same-named local skill
  // is not a collision.
  const byName = new Map();
  for (const f of found) {
    const key = `${f.origin === 'synced' ? 'synced/' : ''}${f.name}`;
    if (!byName.has(key)) byName.set(key, { ...f, locations: [], hashes: new Set() });
    const s = byName.get(key);
    s.locations.push(f.location);
    s.hashes.add(f.hash);
  }

  const skills = [];
  for (const s of byName.values()) {
    if (s.hashes.size > 1) {
      issues.push({ severity: 'error', type: 'name-collision', name: s.name, paths: s.locations.map((l) => l.path), message: `"${s.name}" exists with different content in ${s.locations.length} places; the agent may load either.` });
    }
    const agents = [...new Set(s.locations.flatMap((l) => l.agents))];
    skills.push({
      name: s.name,
      description: s.description,
      manualOnly: s.manualOnly,
      wrapperOf: s.wrapperOf,
      ...(s.origin && { origin: s.origin }),
      agents,
      locations: s.locations.map((l) => l.path),
    });
  }
  const installedNames = new Set(skills.flatMap((s) => [s.name, s.name.split(':').pop()]));
  for (const s of skills) {
    if (s.wrapperOf && !installedNames.has(s.wrapperOf)) {
      issues.push({ severity: 'error', type: 'wrapper-target-missing', name: s.name, message: `"${s.name}" runs "${s.wrapperOf}", which is not installed.` });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  computeSimilar(skills);

  // Group identical issues (e.g. nine broken links with the same cause) to keep the output short.
  const groups = new Map();
  for (const { severity, type, message, ...detail } of issues) {
    const key = `${severity}|${type}|${message}`;
    if (!groups.has(key)) groups.set(key, { severity, type, message, items: [] });
    groups.get(key).items.push(detail);
  }
  const order = { error: 0, warning: 1, info: 2 };
  const groupedIssues = [...groups.values()].sort((a, b) => order[a.severity] - order[b.severity]);

  const scannedOut = {
    found: scanned.filter((d) => d.exists).map(({ path: p, scope, agents }) => ({ path: p, scope, agents })),
    missing: scanned.filter((d) => !d.exists).map((d) => d.path),
  };

  const notes = [];
  if (!args.onlyDirs) {
    notes.push('Skills built into the agent, or loaded from sources not on disk, are not listed here. Merge the skills listed in your context; agents may show them with a prefix such as "plugin:skill".');
  }

  let outSkills = skills;
  let outIssues = groupedIssues;
  let notFound;

  if (args.skill) {
    // Full detail for one skill, plus only the issues that mention it.
    outSkills = skills.filter((s) => s.name === args.skill || s.name.endsWith(`:${args.skill}`));
    if (!outSkills.length) notFound = args.skill;
    outIssues = groupedIssues
      .map((g) => ({ ...g, items: g.items.filter((it) => JSON.stringify(it).includes(args.skill)) }))
      .filter((g) => g.items.length || g.message.includes(`"${args.skill}"`));
  } else if (args.summary || args.text) {
    // Default for listing: one short line per skill, long issue lists truncated.
    outSkills = skills.map(({ name, description, manualOnly, wrapperOf, origin, agents, similarTo }) => ({
      name,
      summary: summarize(description),
      ...(manualOnly && { manualOnly }),
      ...(wrapperOf && { wrapperOf }),
      ...(origin && { origin }),
      agents,
      ...(similarTo && { similarTo }),
    }));
    outIssues = groupedIssues.map((g) => (g.items.length > 3 ? { ...g, count: g.items.length, items: g.items.slice(0, 3) } : g));
  }

  const result = { scanned: scannedOut };
  if (!args.issues) result.skills = outSkills;
  if (notFound) result.notFound = notFound;
  result.issues = outIssues;
  if (notes.length) result.notes = notes;

  if (args.text) console.log(toText(result));
  else console.log(args.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result));
}

main();
