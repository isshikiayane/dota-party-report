const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ACCENTS = ['cyan', 'violet', 'amber', 'blue', 'rose'];

function buildData(options) {
  const ids = Array.from(new Set((options.ids || []).map(String)));
  if (ids.length < 2 || ids.length > 5) throw new Error('report requires 2 to 5 unique account IDs');

  const bundles = options.bundles || {};
  const heroesRaw = options.heroesRaw || {};
  const officialHeroNames = options.officialHeroNames || {};
  const players = {};
  const matchMap = new Map();

  ids.forEach((id, index) => {
    const bundle = bundles[id];
    if (!bundle) throw new Error('missing data bundle for account ' + id);
    const profile = bundle.profile && bundle.profile.profile ? bundle.profile.profile : {};
    players[id] = {
      id,
      tag: 'PLAYER ' + String(index + 1).padStart(2, '0'),
      accent: ACCENTS[index] || ACCENTS[0],
      name: profile.personaname || profile.name || ('Account ' + id),
      avatar: profile.avatarfull || profile.avatarmedium || profile.avatar || '',
      steamid: profile.steamid || '',
      profileurl: profile.profileurl || '',
      apiStatus: bundle.profile && bundle.profile.profile ? 200 : 404,
      sourceName: profile.personaname || profile.name || null
    };

    for (const row of bundle.matches || []) {
      const matchId = String(row.match_id);
      let record = matchMap.get(matchId);
      if (!record) {
        record = {
          match_id: matchId,
          start_time: row.start_time || 0,
          duration: row.duration || 0,
          radiant_win: row.radiant_win,
          game_mode: row.game_mode,
          lobby_type: row.lobby_type,
          players: {}
        };
        matchMap.set(matchId, record);
      }
      record.start_time = record.start_time || row.start_time || 0;
      record.duration = Math.max(record.duration || 0, row.duration || 0);
      if (typeof record.radiant_win !== 'boolean' && typeof row.radiant_win === 'boolean') record.radiant_win = row.radiant_win;
      record.players[id] = {
        player_slot: row.player_slot,
        radiant: Number(row.player_slot) < 128,
        hero_id: row.hero_id,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        partySize: row.party_size,
        radiant_win: row.radiant_win
      };
    }
  });

  const heroes = {};
  for (const key of Object.keys(heroesRaw)) {
    const hero = heroesRaw[key];
    const slug = String(hero.name || '').replace(/^npc_dota_hero_/, '');
    heroes[String(hero.id || key)] = {
      id: hero.id || Number(key),
      name: officialHeroNames[slug] || hero.localized_name || hero.name || ('英雄 #' + key),
      slug,
      roles: Array.isArray(hero.roles) ? hero.roles : []
    };
  }

  const matches = Array.from(matchMap.values())
    .filter((match) => Object.keys(match.players).length >= 2)
    .sort((a, b) => Number(a.start_time) - Number(b.start_time));

  return {
    meta: {
      source: 'OpenDota public API',
      fetched_at: options.fetchedAt || new Date().toISOString(),
      api_query: 'GET /players/{account_id} and GET /players/{account_id}/matches?significant=0&limit=10000',
      selected_history_rows: ids.reduce((sum, id) => sum + ((bundles[id].matches || []).length), 0),
      canonical_matches: matchMap.size,
      shared_records: matches.length,
      profile_verified: ids.filter((id) => players[id].apiStatus === 200).length,
      default_selected: (options.defaultSelection || ids).map(String).filter((id) => ids.includes(id))
    },
    ids,
    players,
    heroes,
    matches
  };
}

function renderReport(data) {
  let payload = JSON.stringify(data);
  payload = payload.replace(/</g, '\\u003c');

const html = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Dota Party Lab · 2–5 人开黑生涯</title>
  <style>
    :root {
      --bg: #090908;
      --panel: rgba(19, 18, 17, .9);
      --panel-2: rgba(26, 24, 22, .76);
      --line: rgba(205, 185, 148, .17);
      --line-strong: rgba(217, 182, 110, .35);
      --ink: #f3eee6;
      --muted: #aaa198;
      --faint: #77736d;
      --dire: #d8543f;
      --dire-deep: #74251f;
      --radiant: #73b79e;
      --radiant-deep: #284c40;
      --gold: #d9b66e;
      --cyan: var(--dire);
      --violet: #789ca0;
      --amber: var(--gold);
      --green: var(--radiant);
      --rose: #e06459;
      --shadow: 0 24px 90px rgba(0, 0, 0, .48);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-width: 320px;
      color: var(--ink);
      background:
        radial-gradient(circle at 8% -10%, rgba(216, 84, 63, .22), transparent 33rem),
        radial-gradient(circle at 94% 4%, rgba(115, 183, 158, .16), transparent 34rem),
        radial-gradient(circle at 50% 82%, rgba(217, 182, 110, .055), transparent 42rem),
        linear-gradient(180deg, #0d0c0b 0%, #08090a 58%, #0d0b0a 100%);
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      line-height: 1.5;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .28;
      background-image:
        linear-gradient(35deg, transparent 48.7%, rgba(216, 84, 63, .075) 49.4%, transparent 50.1%),
        linear-gradient(-35deg, transparent 48.7%, rgba(115, 183, 158, .065) 49.4%, transparent 50.1%),
        radial-gradient(circle at center, transparent 0 28%, rgba(217, 182, 110, .045) 28.4% 28.8%, transparent 29.2%);
      background-size: 310px 210px, 310px 210px, 520px 520px;
      mask-image: linear-gradient(180deg, #000, rgba(0,0,0,.75) 58%, transparent 96%);
    }
    body::after {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .08;
      background: repeating-linear-gradient(135deg, transparent 0 12px, rgba(217,182,110,.035) 13px);
      mix-blend-mode: screen;
    }
    a { color: inherit; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    .app { position: relative; z-index: 1; width: min(1440px, calc(100% - 40px)); margin: 0 auto; padding: 22px 0 72px; }
    .topbar { display: flex; justify-content: space-between; gap: 20px; align-items: center; margin-bottom: 22px; padding: 5px 0 16px; border-bottom: 1px solid rgba(217,182,110,.13); color: var(--muted); font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
    .brand { display: flex; align-items: center; gap: 12px; color: var(--ink); font-weight: 800; }
    .brand-icon { flex: 0 0 auto; width: 30px; height: 30px; filter: drop-shadow(0 0 10px rgba(216,84,63,.28)); }
    .brand-icon .logo-tile { fill: var(--dire); }
    .brand-icon .logo-cut { fill: var(--ink); }
    .live { display: flex; gap: 9px; align-items: center; white-space: nowrap; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 14px var(--green); animation: blink 1.7s infinite; }
    .hero { min-height: 360px; display: grid; grid-template-columns: 1fr; gap: 22px; align-items: stretch; }
    .hero-copy, .panel { border: 1px solid var(--line); box-shadow: var(--shadow); }
    .hero-copy { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; padding: clamp(30px, 5vw, 72px); background: radial-gradient(circle at 84% 22%, rgba(115,183,158,.11), transparent 28%), linear-gradient(112deg, rgba(216,84,63,.12), transparent 42%), linear-gradient(145deg, rgba(27,24,22,.95), rgba(9,11,12,.9)); }
    .hero-copy::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(118deg, rgba(216,84,63,.07), transparent 44%), linear-gradient(298deg, rgba(115,183,158,.07), transparent 37%); }
    .hero-copy::after { content: ""; position: absolute; width: 420px; height: 420px; right: -112px; bottom: -168px; border: 1px solid rgba(217,182,110,.18); border-radius: 50%; background: repeating-conic-gradient(from 18deg, transparent 0 12deg, rgba(216,84,63,.045) 13deg, transparent 15deg); box-shadow: 0 0 0 28px rgba(217,182,110,.022), 0 0 0 72px rgba(115,183,158,.018), inset 0 0 70px rgba(0,0,0,.25); }
    .hero-copy > * { position: relative; z-index: 1; }
    .eyebrow { display: flex; align-items: center; gap: 10px; color: var(--gold); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; font-weight: 800; }
    .eyebrow::before { content: ""; width: 34px; height: 2px; background: linear-gradient(90deg, var(--dire), var(--gold)); box-shadow: 0 0 12px rgba(216,84,63,.35); }
    h1 { max-width: none; margin: 18px 0 20px; font-size: clamp(34px, 5vw, 72px); line-height: 1.02; letter-spacing: .015em; font-weight: 900; white-space: nowrap; }
    h1 em { color: var(--dire); font-style: normal; text-shadow: 0 0 32px rgba(216,84,63,.25); }
    .hero-copy > p { max-width: 620px; margin: 0; color: var(--muted); font-size: 15px; }
    .section-kicker { margin: 0 0 8px; color: var(--gold); font-size: 11px; font-weight: 800; letter-spacing: .19em; text-transform: uppercase; }
    .section-title { margin: 0; font-size: clamp(22px, 3vw, 34px); letter-spacing: -.045em; }
    .section-sub { margin: 7px 0 0; color: var(--muted); font-size: 13px; }
    .panel { position: relative; overflow: hidden; margin-top: 22px; padding: clamp(20px, 3vw, 32px); background: linear-gradient(145deg, rgba(24,22,20,.88), rgba(9,11,13,.82)); }
    .panel::before { content: ""; position: absolute; left: 0; top: 0; width: 100%; height: 1px; background: linear-gradient(90deg, rgba(216,84,63,.7), rgba(217,182,110,.24) 48%, rgba(115,183,158,.55)); opacity: .72; }
    .panel-head { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 20px; }
    .snapshot { color: var(--faint); font-size: 11px; text-align: right; line-height: 1.7; }
    .snapshot b { color: var(--green); font-weight: 700; }
    .selector { display: grid; gap: 14px; }
    .selector-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .preset-row { display: flex; flex-wrap: wrap; gap: 7px; }
    .preset { border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: rgba(8,8,8,.58); padding: 7px 12px; font-size: 11px; transition: .2s ease; }
    .preset.active, .preset:hover { border-color: var(--gold); color: var(--ink); background: linear-gradient(135deg, rgba(216,84,63,.22), rgba(217,182,110,.08)); box-shadow: 0 0 18px rgba(216,84,63,.1), inset 0 0 12px rgba(217,182,110,.04); }
    .btn { border: 1px solid rgba(217,182,110,.42); border-radius: 10px; color: var(--ink); background: linear-gradient(135deg, rgba(216,84,63,.28), rgba(217,182,110,.12)); padding: 10px 15px; font-weight: 800; }
    .btn:hover { border-color: var(--gold); box-shadow: 0 0 20px rgba(216,84,63,.16); }
    .selected-count { color: var(--muted); font-size: 12px; }
    .player-select-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .player-select { position: relative; display: block; border: 1px solid var(--line); border-radius: 13px; padding: 14px; background: rgba(11,11,10,.68); cursor: pointer; transition: .2s ease; overflow: hidden; }
    .player-select:hover { border-color: var(--line-strong); transform: translateY(-2px); }
    .player-select.selected { border-color: rgba(217,182,110,.62); background: linear-gradient(140deg, rgba(216,84,63,.14), rgba(11,12,12,.82) 54%, rgba(115,183,158,.055)); box-shadow: inset 0 0 24px rgba(216,84,63,.045), 0 10px 28px rgba(0,0,0,.18); }
    .player-select input { position: absolute; opacity: 0; pointer-events: none; }
    .select-check { position: absolute; top: 12px; right: 12px; width: 17px; height: 17px; border: 1px solid var(--line-strong); border-radius: 5px; }
    .player-select.selected .select-check { border-color: var(--gold); background: var(--gold); box-shadow: 0 0 16px rgba(217,182,110,.34); }
    .player-select.selected .select-check::after { content: "✓"; display: block; color: #1a1209; font-size: 12px; font-weight: 900; line-height: 15px; text-align: center; }
    .player-line { display: flex; align-items: center; gap: 10px; padding-right: 22px; }
    .avatar { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--line-strong); background: linear-gradient(145deg, rgba(216,84,63,.22), rgba(115,183,158,.1)); object-fit: cover; }
    .avatar-fallback { display: grid; place-items: center; color: var(--cyan); font-weight: 900; }
    .avatar + .avatar-fallback { display: none; }
    .player-name { min-width: 0; }
    .player-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
    .player-name span { display: block; margin-top: 2px; color: var(--faint); font-size: 10px; }
    .player-id { display: block; margin-top: 12px; color: var(--faint); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; }
    .player-select .accent-bar { position: absolute; left: 0; bottom: 0; width: 100%; height: 2px; background: linear-gradient(90deg, var(--dire), var(--gold), var(--radiant)); opacity: .24; }
    .player-select.selected .accent-bar { opacity: 1; box-shadow: 0 0 14px rgba(216,84,63,.34); }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-top: 22px; }
    .kpi { position: relative; min-height: 122px; overflow: hidden; border: 1px solid var(--line); border-radius: 13px; padding: 17px; background: linear-gradient(145deg, rgba(32,28,24,.74), rgba(11,12,13,.76)); }
    .kpi::after { content: ""; position: absolute; right: -22px; bottom: -35px; width: 110px; height: 110px; border: 1px solid rgba(217,182,110,.1); border-radius: 50%; box-shadow: 0 0 0 16px rgba(216,84,63,.018); }
    .kpi-label { color: var(--muted); font-size: 11px; }
    .kpi-value { margin-top: 8px; font-size: clamp(25px, 4vw, 40px); font-weight: 800; letter-spacing: -.06em; }
    .kpi-note { color: var(--faint); font-size: 10px; }
    .kpi:nth-child(2) .kpi-value { color: var(--green); }
    .kpi:nth-child(3) .kpi-value { color: var(--gold); }
    .kpi:nth-child(4) .kpi-value { color: var(--dire); font-size: clamp(18px, 2.6vw, 27px); }
    .members { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; }
    .member-chip { display: flex; align-items: center; gap: 7px; padding: 6px 9px 6px 6px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); background: rgba(10,10,9,.58); font-size: 11px; }
    .member-chip img { width: 23px; height: 23px; border-radius: 50%; object-fit: cover; }
    .member-chip b { color: var(--ink); font-weight: 700; }
    .commentary-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .comment-card { position: relative; overflow: hidden; min-height: 150px; border: 1px solid var(--line); border-radius: 14px; padding: 18px 18px 16px 20px; background: linear-gradient(145deg, rgba(28,25,22,.76), rgba(10,11,12,.72)); }
    .comment-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--gold); box-shadow: 0 0 16px rgba(217,182,110,.25); }
    .comment-card.good::before { background: var(--radiant); box-shadow: 0 0 16px rgba(115,183,158,.28); }
    .comment-card.dire::before { background: var(--dire); box-shadow: 0 0 16px rgba(216,84,63,.28); }
    .comment-card.muted::before { background: var(--faint); box-shadow: none; }
    .comment-card.verdict { grid-column: 1 / -1; min-height: 0; background: linear-gradient(115deg, rgba(216,84,63,.11), rgba(217,182,110,.055) 52%, rgba(115,183,158,.075)); }
    .comment-label { color: var(--gold); font-size: 9px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    .comment-card.good .comment-label { color: var(--radiant); }
    .comment-card.dire .comment-label { color: var(--dire); }
    .comment-card.muted .comment-label { color: var(--muted); }
    .comment-card h3 { margin: 7px 0 9px; font-size: 16px; letter-spacing: -.025em; }
    .comment-card p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.75; }
    .comment-meta { display: block; margin-top: 11px; color: var(--faint); font-size: 10px; }
    .dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(330px, .85fr); gap: 22px; margin-top: 22px; }
    .subpanel { border: 1px solid var(--line); border-radius: 14px; padding: 20px; background: linear-gradient(145deg, rgba(25,23,21,.73), rgba(9,10,11,.68)); }
    .subpanel h3 { margin: 0; font-size: 16px; letter-spacing: -.025em; }
    .subpanel .hint { margin: 5px 0 17px; color: var(--faint); font-size: 11px; }
    .year-chart { display: flex; gap: 8px; align-items: end; height: 190px; padding: 20px 4px 0; border-bottom: 1px solid var(--line); }
    .year-bar-wrap { min-width: 30px; flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: end; align-items: center; gap: 7px; cursor: pointer; }
    .year-bar { position: relative; width: min(42px, 75%); min-height: 4px; border: 1px solid rgba(216,84,63,.48); border-bottom: 0; border-radius: 8px 8px 0 0; background: linear-gradient(180deg, rgba(216,84,63,.92), rgba(116,37,31,.2)); box-shadow: 0 0 18px rgba(216,84,63,.12); transition: .25s ease; }
    .year-bar:hover { background: linear-gradient(180deg, var(--amber), rgba(217,182,110,.16)); }
    .year-bar-wrap.selected .year-bar { border-color: var(--amber); background: linear-gradient(180deg, var(--amber), rgba(217,182,110,.18)); box-shadow: 0 0 22px rgba(217,182,110,.2); }
    .year-bar-wrap.selected .year-label { color: var(--amber); font-weight: 800; }
    .year-count { position: absolute; top: -18px; width: 100%; color: var(--dire); font-size: 9px; text-align: center; }
    .year-label { color: var(--faint); font-size: 10px; }
    .year-detail { min-height: 76px; margin-top: 16px; padding: 13px 14px; border: 1px solid var(--line); border-radius: 11px; background: rgba(10,10,9,.56); }
    .year-detail-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
    .year-detail-head strong { color: var(--amber); font-size: 14px; }
    .year-detail-head span { color: var(--faint); font-size: 10px; }
    .year-detail-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    .year-detail-stat { min-width: 0; }
    .year-detail-stat span { display: block; color: var(--faint); font-size: 9px; }
    .year-detail-stat b { display: block; margin-top: 2px; color: var(--ink); font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; word-break: normal; }
    .signal-grid { display: grid; gap: 10px; }
    .signal { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 13px 14px; border: 1px solid var(--line); border-radius: 11px; background: rgba(10,10,9,.56); }
    .signal-label { color: var(--muted); font-size: 11px; }
    .signal-value { color: var(--ink); font-size: 13px; font-weight: 800; text-align: right; }
    .signal-value.good { color: var(--green); }
    .signal-value.warn { color: var(--amber); }
    .quality-note { margin-top: 11px; padding: 13px 14px; border-left: 2px solid var(--amber); background: rgba(217,182,110,.055); color: var(--muted); font-size: 11px; }
    .quality-note b { color: var(--amber); }
    .hero-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .hero-column { min-width: 0; border: 1px solid var(--line); border-radius: 13px; padding: 15px; background: rgba(10,10,9,.48); }
    .hero-column-head { display: flex; align-items: center; gap: 9px; padding-bottom: 13px; border-bottom: 1px solid var(--line); }
    .hero-column-head img { width: 30px; height: 30px; border-radius: 9px; object-fit: cover; }
    .hero-column-head strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
    .hero-column-head span { color: var(--faint); font-size: 10px; }
    .role-lens { display: grid; gap: 5px; margin: 14px 0; }
    .role-row { display: grid; grid-template-columns: 52px 1fr 34px; align-items: center; gap: 7px; color: var(--faint); font-size: 9px; }
    .role-track { height: 5px; border-radius: 99px; background: rgba(205,185,148,.11); overflow: hidden; }
    .role-fill { height: 100%; border-radius: inherit; background: var(--dire); }
    .role-row:nth-child(2) .role-fill { background: var(--radiant); }
    .role-row:nth-child(3) .role-fill { background: var(--amber); }
    .hero-list { display: grid; gap: 8px; }
    .hero-row { display: grid; grid-template-columns: 29px minmax(0,1fr) 90px; align-items: center; gap: 8px; }
    .hero-row img { width: 29px; height: 29px; border-radius: 7px; object-fit: cover; background: #1a1714; }
    .hero-row-name { min-width: 0; }
    .hero-row-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
    .hero-row-name span { color: var(--faint); font-size: 9px; }
    .hero-row-stat { color: var(--muted); font-size: 10px; text-align: right; }
    .hero-row-stat b { color: var(--green); }
    .timeline { display: grid; gap: 0; position: relative; }
    .timeline::before { content: ""; position: absolute; left: 12px; top: 12px; bottom: 12px; width: 1px; background: linear-gradient(var(--dire), var(--gold) 48%, rgba(115,183,158,.08)); }
    .match-item { position: relative; display: grid; grid-template-columns: 25px minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 12px 0; }
    .match-node { position: relative; z-index: 1; width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid rgba(217,182,110,.48); border-radius: 50%; background: #13110f; color: var(--gold); font-size: 9px; }
    .match-main { min-width: 0; }
    .match-main strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .match-main span { display: block; margin-top: 2px; color: var(--faint); font-size: 10px; }
    .match-heroes { display: flex; gap: 3px; margin-top: 5px; }
    .mini-hero { width: 24px; height: 16px; border-radius: 3px; object-fit: cover; opacity: .9; }
    .match-result { min-width: 55px; color: var(--green); font-size: 11px; font-weight: 800; text-align: right; }
    .match-result.loss { color: var(--rose); }
    .data-boundary { display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center; border-color: rgba(217,182,110,.24); background: linear-gradient(145deg, rgba(58,38,22,.34), rgba(13,13,12,.74)); }
    .boundary-title { display: flex; align-items: center; gap: 8px; color: var(--amber); font-size: 12px; font-weight: 800; }
    .boundary-title::before { content: "!"; display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid var(--amber); border-radius: 50%; }
    .boundary-text { margin: 8px 0 0; color: var(--muted); font-size: 11px; }
    .boundary-text code { color: var(--amber); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .refresh-status { min-width: 145px; color: var(--faint); font-size: 10px; text-align: right; }
    .foot { padding-top: 28px; color: var(--faint); font-size: 10px; text-align: center; }
    .muted { color: var(--faint); }
    @keyframes blink { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
    @media (max-width: 980px) {
      .hero { grid-template-columns: 1fr; }
      .hero-copy { min-height: 390px; }
      .player-select-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
      .dashboard-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .app { width: min(100% - 22px, 1440px); padding-top: 12px; }
      .topbar { font-size: 9px; }
      .topbar .live span:last-child { display: none; }
      .hero-copy { padding: 28px 22px; }
      h1 { font-size: clamp(22px, 7.2vw, 38px); letter-spacing: 0; }
      .panel { padding: 17px 13px; }
      .panel-head { align-items: start; flex-direction: column; }
      .snapshot { text-align: left; }
      .player-select-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .kpi { min-height: 105px; padding: 13px; }
      .kpi-value { font-size: 28px; }
      .hero-grid { grid-template-columns: 1fr; }
      .commentary-grid { grid-template-columns: 1fr; }
      .year-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .data-boundary { grid-template-columns: 1fr; }
      .refresh-status { text-align: left; }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div class="brand">
        <svg class="brand-icon" viewBox="0 0 600 600" role="img" aria-label="Dota 2">
          <title>Dota 2</title>
          <rect class="logo-tile" x="32" y="28.5" width="540" height="544" rx="24"/>
          <path class="logo-cut" d="M95 145.5 149 115l361 306-36 86-113-26L95 145.5Z"/>
          <path class="logo-cut" d="m458.3 90.2 61.7 46.8-8.7 75.4-132.1-101.9 79.1-20.3Z" transform="rotate(3.874 449.6 151.3)"/>
          <path class="logo-cut" d="m84 466.6 16.7-93.6L228 482.8 131.6 506 84 466.6Z"/>
        </svg>
        <span>DOTA 2 // 开黑档案</span>
      </div>
      <div class="live"><span class="live-dot"></span><span>公开数据快照</span><span id="snapshot">读取中…</span></div>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">天辉 × 夜魇 · 组队战绩档案</div>
        <h1>谁和谁上分，<em>谁和谁坐牢</em></h1>
        <p>把你输入的 2–5 个公开账号放进同一张 Dota 生涯图里。勾选任意组合，页面会即时重算同场同阵营记录、胜率、英雄池、年份走势与第一次一起出现的比赛。</p>
      </div>
    </section>

    <section class="panel" id="selector">
      <div class="panel-head">
        <div>
          <p class="section-kicker">01 / 阵容选择</p>
          <h2 class="section-title">选择你想复盘的队伍</h2>
          <p class="section-sub">至少选择 2 人；任意组合都按“同一场、同一阵营”统计。</p>
        </div>
        <div class="snapshot" id="selectorSnapshot">OpenDota public API<br><b>资料名已嵌入本地页面</b></div>
      </div>
      <div class="selector">
        <div class="selector-toolbar">
          <div class="preset-row">
            <button class="preset active" data-preset="2">双黑</button>
            <button class="preset" data-preset="3">三黑</button>
            <button class="preset" data-preset="4">四黑</button>
            <button class="preset" data-preset="5">五黑</button>
          </div>
          <div class="selected-count" id="selectedCount">读取中…</div>
        </div>
        <div class="player-select-grid" id="playerSelectGrid"></div>
      </div>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">公开同场同阵营记录</div><div class="kpi-value" id="kpiGames">—</div><div class="kpi-note" id="kpiGamesNote">—</div></div>
        <div class="kpi"><div class="kpi-label">队伍胜率</div><div class="kpi-value" id="kpiWinrate">—</div><div class="kpi-note" id="kpiRecord">—</div></div>
        <div class="kpi"><div class="kpi-label">总局内时间</div><div class="kpi-value" id="kpiHours">—</div><div class="kpi-note" id="kpiAvg">—</div></div>
        <div class="kpi"><div class="kpi-label">第一次共同比赛</div><div class="kpi-value" id="kpiFirst">—</div><div class="kpi-note" id="kpiFirstMatch">—</div></div>
      </div>
      <div class="members" id="members"></div>
    </section>

    <section class="panel commentary-panel">
      <div class="panel-head">
        <div>
          <p class="section-kicker">战报 / 开黑锐评</p>
          <h2 class="section-title">这组人的开黑表现怎么样？</h2>
          <p class="section-sub">用数据说人话：夸得有依据，吐槽也会标明样本和公开数据边界。</p>
        </div>
      </div>
      <div class="commentary-grid" id="commentaryGrid"></div>
    </section>

    <section class="dashboard-grid">
      <div class="subpanel">
        <p class="section-kicker">02 / 战线年表</p>
        <h3>你们在哪些年份一起打得最多？</h3>
        <p class="hint">按所选组合的共同比赛日期归档；点击任意年份柱子查看该年的场次、战绩和时长。</p>
        <div class="year-chart" id="yearChart"></div>
        <div class="year-detail" id="yearDetail"></div>
      </div>
      <div class="subpanel">
        <p class="section-kicker">03 / 组队证据</p>
        <h3>组合信号</h3>
        <p class="hint">把“共同出现”和“可证明同队组队”分开看。</p>
        <div class="signal-grid" id="signalGrid"></div>
        <div class="quality-note" id="qualityNote"></div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="section-kicker">04 / 英雄印记</p>
          <h2 class="section-title">共同比赛中的英雄选择</h2>
          <p class="section-sub">展示当前选中组合中每个人最常使用的英雄及对应战绩。</p>
        </div>
      </div>
      <div class="hero-grid" id="heroGrid"></div>
    </section>

    <section class="dashboard-grid">
      <div class="subpanel">
        <p class="section-kicker">05 / 初次集结</p>
        <h3 id="timelineTitle">第一次一起出现的比赛</h3>
        <p class="hint">按公开比赛记录中最早的时间排序。</p>
        <div class="timeline" id="timeline"></div>
      </div>
      <div class="subpanel">
        <p class="section-kicker">06 / 连胜节奏</p>
        <h3>最长连胜 / 连败</h3>
        <p class="hint">只在所选组合的同阵营共同比赛中计算。</p>
        <div class="signal-grid" id="streaks"></div>
      </div>
    </section>

    <section class="panel data-boundary">
      <div>
        <div class="boundary-title">公开 API 边界说明</div>
        <p class="boundary-text">本页嵌入的是 OpenDota 在 <code id="fetchedAt">—</code> 返回的公开快照。它只能覆盖 OpenDota 看得到、且已解析的比赛；隐私设置、未解析比赛、接口限流或历史数据缺口都会让数量偏少。页面把“账号同时出现且同阵营”作为共同开黑口径，但公开列表里的“组队人数”字段为空时，不能仅凭列表证明当时一定在同一个队伍里。资料名是查询时的当前公开名称，不是历史别名。</p>
      </div>
      <div>
        <button class="btn" id="refreshProfiles">联网刷新资料名</button>
        <div class="refresh-status" id="refreshStatus">当前已内嵌公开资料名</div>
      </div>
    </section>

    <footer class="foot">DOTA 2 开黑档案 · 本地单文件报告 · 比赛数据来自 OpenDota 公开记录</footer>
  </main>

  <script>
    window.DOTA_DATA = __DATA_PAYLOAD__;
  </script>
  <script>
    (function () {
      'use strict';
      var DATA = window.DOTA_DATA;
      var IDS = DATA.ids.slice();
      var state = { selected: (DATA.meta.default_selected || IDS).slice(), year: null };
      var tz = 'Asia/Shanghai';

      function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
      }
      function player(id) { return DATA.players[id]; }
      function hero(id) { return DATA.heroes[String(id)] || { name: '英雄 #' + id, slug: 'unknown', roles: [] }; }
      function avatarHtml(p, cls) {
        var initial = esc((p.name || '?').slice(0, 1));
        var fallback = '<span class="avatar ' + (cls || '') + ' avatar-fallback">' + initial + '</span>';
        if (!p.avatar) return fallback;
        return '<img class="avatar ' + (cls || '') + '" src="' + esc(p.avatar) + '" alt="" onerror="this.replaceWith(this.nextElementSibling)">' + fallback;
      }
      function heroImageUrl(h) {
        return 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/' + encodeURIComponent(h.slug) + '.png';
      }
      function dateTime(timestamp, compact) {
        if (!timestamp) return '未知时间';
        return new Intl.DateTimeFormat('zh-CN', compact ? { timeZone: tz, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(Number(timestamp) * 1000));
      }
      function dateOnly(timestamp) {
        if (!timestamp) return '—';
        return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Number(timestamp) * 1000));
      }
      function yearOf(timestamp) {
        return new Intl.DateTimeFormat('en', { timeZone: tz, year: 'numeric' }).format(new Date(Number(timestamp) * 1000));
      }
      function formatHours(seconds) {
        var hours = seconds / 3600;
        return hours >= 100 ? hours.toFixed(0) + ' h' : hours.toFixed(1) + ' h';
      }
      function formatDuration(seconds) {
        var mins = Math.round(seconds / 60);
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
      }
      function winFor(record, id) {
        var row = record.players[id];
        return !!row && record.radiant_win === row.radiant;
      }
      function groupLabel(ids) {
        return ids.map(function (id) { return player(id).name; }).join(' × ');
      }
      function isSameTeam(record, ids) {
        var rows = ids.map(function (id) { return record.players[id]; });
        if (rows.some(function (row) { return !row; })) return false;
        return rows.every(function (row) { return row.radiant === rows[0].radiant; });
      }
      function getStats(ids) {
        var present = [];
        var conflicts = 0;
        DATA.matches.forEach(function (record) {
          if (!ids.every(function (id) { return !!record.players[id]; })) return;
          if (isSameTeam(record, ids)) present.push(record);
          else conflicts += 1;
        });
        present.sort(function (a, b) { return Number(a.start_time) - Number(b.start_time); });
        var wins = present.filter(function (record) { return winFor(record, ids[0]); }).length;
        var duration = present.reduce(function (sum, record) { return sum + Number(record.duration || 0); }, 0);
        var partyKnown = present.filter(function (record) {
          return ids.every(function (id) { return Number(record.players[id].partySize) >= ids.length; });
        }).length;
        return {
          ids: ids.slice(),
          matches: present,
          allPresent: present.length + conflicts,
          conflicts: conflicts,
          games: present.length,
          wins: wins,
          losses: present.length - wins,
          duration: duration,
          partyKnown: partyKnown,
          winrate: present.length ? wins / present.length : 0,
          first: present[0] || null,
          last: present[present.length - 1] || null
        };
      }
      function setSelection(ids) {
        state.selected = ids.slice();
        state.year = null;
        render();
        document.getElementById('selector').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      function renderRoster() {
        var html = IDS.map(function (id) {
          var p = player(id);
          var selected = state.selected.indexOf(id) >= 0;
          return '<label class="player-select ' + (selected ? 'selected' : '') + '">' +
            '<input type="checkbox" data-player-check="' + id + '" ' + (selected ? 'checked' : '') + '>' +
            '<span class="select-check"></span>' +
            '<div class="player-line">' + avatarHtml(p) + '<div class="player-name"><strong>' + esc(p.name) + '</strong><span>' + esc(p.tag) + '</span></div></div>' +
            '<code class="player-id">' + esc(id) + '</code><span class="accent-bar"></span></label>';
        }).join('');
        document.getElementById('playerSelectGrid').innerHTML = html;
        document.getElementById('selectedCount').textContent = '已选 ' + state.selected.length + ' / ' + IDS.length + ' 人';
        document.querySelectorAll('[data-preset]').forEach(function (button) {
          var size = Number(button.getAttribute('data-preset'));
          button.hidden = size > IDS.length;
          button.classList.toggle('active', size === state.selected.length);
        });
      }
      function renderMembers(stats) {
        document.getElementById('members').innerHTML = stats.ids.map(function (id) {
          var p = player(id);
          return '<span class="member-chip">' + avatarHtml(p) + '<b>' + esc(p.name) + '</b></span>';
        }).join('');
      }
      function renderKpis(stats) {
        document.getElementById('kpiGames').textContent = stats.games.toLocaleString('en-US');
        document.getElementById('kpiGamesNote').textContent = stats.conflicts ? stats.conflicts + ' 场同场但不同阵营未计入' : '未发现不同阵营同场记录';
        document.getElementById('kpiWinrate').textContent = (stats.winrate * 100).toFixed(1) + '%';
        document.getElementById('kpiRecord').textContent = stats.wins + ' 胜 · ' + stats.losses + ' 负';
        document.getElementById('kpiHours').textContent = formatHours(stats.duration);
        document.getElementById('kpiAvg').textContent = stats.games ? '平均 ' + formatDuration(stats.duration / stats.games) + ' / 局' : '暂无共同比赛';
        document.getElementById('kpiFirst').textContent = stats.first ? dateOnly(stats.first.start_time) : '未查到';
        document.getElementById('kpiFirstMatch').textContent = stats.first ? '比赛 ' + stats.first.match_id : '公开快照没有同队记录';
      }
      function commentCard(label, title, body, meta, tone) {
        return '<article class="comment-card ' + esc(tone || '') + '">' +
          '<span class="comment-label">' + esc(label) + '</span>' +
          '<h3>' + esc(title) + '</h3>' +
          '<p>' + esc(body) + '</p>' +
          '<span class="comment-meta">' + esc(meta) + '</span>' +
        '</article>';
      }
      function renderCommentary(stats) {
        var target = document.getElementById('commentaryGrid');
        var mode = ({ 2: '双黑', 3: '三黑', 4: '四黑', 5: '五黑' })[stats.ids.length] || stats.ids.length + ' 人组合';
        if (!stats.games) {
          target.innerHTML =
            commentCard('共同轨迹', '公开快照里还没有交集', '当前没有查到这些账号同时出现在同一阵营的比赛，因此无法判断活跃年份、胜率或英雄习惯。这不等同于确定没有一起玩过。', mode + ' · 公开数据可能存在缺口', 'muted') +
            commentCard('解读边界', '先不要把“没有记录”当成“没有开黑”', '隐私设置、未解析比赛和早期历史记录缺失都会让公开数据偏少。换一个组合后，点评会立即重新计算。', '数据来源：当前内嵌的 OpenDota 快照', 'muted') +
            commentCard('一句话锐评', '证据席空着，先别急着开庭', '没有共同比赛样本时，夸人和分锅都只是脑补。先换一个组合，或者等待更多公开比赛被解析。', '零样本不做实力结论', 'verdict muted');
          return;
        }

        var byYear = {};
        stats.matches.forEach(function (record) {
          var year = yearOf(record.start_time);
          byYear[year] = (byYear[year] || 0) + 1;
        });
        var years = Object.keys(byYear).sort();
        var peakYear = years.reduce(function (best, year) { return !best || byYear[year] > byYear[best] ? year : best; }, null);
        var peakShare = peakYear ? byYear[peakYear] / stats.games : 0;
        var activityTitle;
        var activityBody;
        if (stats.games >= 500) {
          activityTitle = '这是一组长期固定搭档';
          activityBody = '共同比赛已经超过 500 场，不是偶尔碰巧排到一起。' + peakYear + ' 年最密集，共 ' + byYear[peakYear] + ' 场，占全部记录的 ' + (peakShare * 100).toFixed(1) + '%。';
        } else if (stats.games >= 100) {
          activityTitle = '共同作战已经形成稳定轨迹';
          activityBody = '公开记录里有 ' + stats.games + ' 场同阵营比赛，足以看出持续合作的痕迹。最活跃的是 ' + peakYear + ' 年，共 ' + byYear[peakYear] + ' 场。';
        } else if (stats.games >= 20) {
          activityTitle = '有一段清晰的共同作战经历';
          activityBody = '目前找到 ' + stats.games + ' 场共同比赛，主要集中在 ' + peakYear + ' 年。样本可以观察趋势，但还不适合对细小差距下结论。';
        } else {
          activityTitle = '这组人的公开样本还比较少';
          activityBody = '目前只找到 ' + stats.games + ' 场共同比赛，一两场胜负就会明显改变比例。这里更适合当作开黑线索，而不是稳定实力评价。';
        }
        var activityMeta = dateOnly(stats.first.start_time) + ' → ' + dateOnly(stats.last.start_time) + ' · 覆盖 ' + years.length + ' 个年份';

        var winratePct = stats.winrate * 100;
        var recordTitle;
        var recordBody;
        var recordTone;
        if (stats.games < 20) {
          recordTitle = '胜率暂时只能参考';
          recordBody = stats.wins + ' 胜 ' + stats.losses + ' 负，胜率 ' + winratePct.toFixed(1) + '%。因为样本较少，几场比赛就能让结果发生明显变化。';
          recordTone = 'muted';
        } else if (winratePct >= 55) {
          recordTitle = '这套组合明显赢多输少';
          recordBody = '整体胜率达到 ' + winratePct.toFixed(1) + '%，长期结果明显偏正向，说明这组人同时出现时通常能把优势转化成胜场。';
          recordTone = 'good';
        } else if (winratePct >= 50) {
          recordTitle = '整体战绩小幅占优';
          recordBody = '胜率为 ' + winratePct.toFixed(1) + '%，赢面略高于五五开。优势不算夸张，但长期累积下来仍然多赢了 ' + (stats.wins - stats.losses) + ' 场。';
          recordTone = 'good';
        } else if (winratePct >= 47) {
          recordTitle = '整体非常接近五五开';
          recordBody = '胜率为 ' + winratePct.toFixed(1) + '%，胜负差距不大。这类组合往往更像稳定娱乐开黑，而不是单纯追求高胜率。';
          recordTone = '';
        } else {
          recordTitle = '这套组合目前输多赢少';
          recordBody = '整体胜率为 ' + winratePct.toFixed(1) + '%，公开记录中负场比胜场多 ' + (stats.losses - stats.wins) + ' 场。可能与阵容磨合、版本时期或固定英雄选择有关。';
          recordTone = 'dire';
        }

        var recentSize = Math.min(20, stats.games);
        var recent = stats.matches.slice(-recentSize);
        var recentWins = recent.filter(function (record) { return winFor(record, stats.ids[0]); }).length;
        var recentRate = recentWins / recentSize * 100;
        var delta = recentRate - winratePct;
        var recentTitle;
        var recentTone;
        if (delta >= 5) {
          recentTitle = '最近一段状态在升温';
          recentTone = 'good';
        } else if (delta <= -5) {
          recentTitle = '最近一段状态有所回落';
          recentTone = 'dire';
        } else {
          recentTitle = '近期表现接近长期水平';
          recentTone = '';
        }
        var longestWin = findStreak(stats.matches, true);
        var longestLoss = findStreak(stats.matches, false);
        var recentBody = '最近 ' + recentSize + ' 场取得 ' + recentWins + ' 胜，胜率 ' + recentRate.toFixed(1) + '%，比整体' + (Math.abs(delta) < .05 ? '几乎没有变化' : (delta > 0 ? '高 ' : '低 ') + Math.abs(delta).toFixed(1) + ' 个百分点') + '。';
        var recentMeta = '历史最长连胜 ' + longestWin.length + ' 场 · 最长连败 ' + longestLoss.length + ' 场';

        var heroProfiles = stats.ids.map(function (id) {
          var counts = {};
          var wins = {};
          stats.matches.forEach(function (record) {
            var heroId = String(record.players[id].hero_id);
            counts[heroId] = (counts[heroId] || 0) + 1;
            wins[heroId] = (wins[heroId] || 0) + (winFor(record, id) ? 1 : 0);
          });
          var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
          if (!top) return { id: id, note: player(id).name + '：暂无', share: 0 };
          return {
            id: id,
            note: player(id).name + '：' + hero(top).name + ' ' + counts[top] + ' 场（' + (wins[top] / counts[top] * 100).toFixed(0) + '%）',
            share: counts[top] / stats.games,
            heroName: hero(top).name
          };
        });
        var mostFixed = heroProfiles.reduce(function (best, item) { return !best || item.share > best.share ? item : best; }, null);
        var heroTitle = mostFixed && mostFixed.share >= .3 ? player(mostFixed.id).name + ' 的舒适区非常明显' : (mostFixed && mostFixed.share >= .16 ? '招牌英雄已经写在脸上' : '英雄选择没有被单一绝活绑死');
        var heroBody = heroProfiles.map(function (item) { return item.note; }).join('；') + '。' + (mostFixed && mostFixed.share >= .3 ? mostFixed.heroName + ' 占其当前组合比赛的 ' + (mostFixed.share * 100).toFixed(1) + '%，这已经不是偏爱，是常驻。' : '这些是当前组合里的最高频选择，不代表完整账号生涯的绝对主力。');

        var playerAverages = stats.ids.map(function (id) {
          var total = stats.matches.reduce(function (sum, record) {
            var row = record.players[id];
            sum.kills += Number(row.kills || 0);
            sum.deaths += Number(row.deaths || 0);
            sum.assists += Number(row.assists || 0);
            return sum;
          }, { kills: 0, deaths: 0, assists: 0 });
          return { id: id, kills: total.kills / stats.games, deaths: total.deaths / stats.games, assists: total.assists / stats.games };
        });
        function highestBy(key) {
          return playerAverages.reduce(function (best, item) { return !best || item[key] > best[key] ? item : best; }, null);
        }
        var killLead = highestBy('kills');
        var assistLead = highestBy('assists');
        var deathLead = highestBy('deaths');
        var roleBody = '人头最多的是 ' + player(killLead.id).name + '，场均 ' + killLead.kills.toFixed(1) + '；助攻最多的是 ' + player(assistLead.id).name + '，场均 ' + assistLead.assists.toFixed(1) + '；死亡最多的是 ' + player(deathLead.id).name + '，场均 ' + deathLead.deaths.toFixed(1) + '。';
        var roleMeta = '死亡多不自动等于最坑：辅助、先手和脏活位通常更容易付账';

        var proofRate = stats.partyKnown / stats.games * 100;
        var proofTitle;
        var proofBody;
        var proofTone;
        if (proofRate >= 80) {
          proofTitle = '这组开黑证据相当硬';
          proofBody = '有 ' + stats.partyKnown + ' 场公开记录的组队人数足以覆盖当前 ' + mode + '，占共同比赛的 ' + proofRate.toFixed(1) + '%。';
          proofTone = 'good';
        } else if (proofRate >= 30) {
          proofTitle = '能确认组队，但证据不是场场齐全';
          proofBody = '公开组队人数足够的记录为 ' + stats.partyKnown + ' / ' + stats.games + ' 场。其余比赛仍能确认同场同阵营，只是组队人数字段没有给全。';
          proofTone = '';
        } else {
          proofTitle = 'OpenDota 对老组队记录的记性不太好';
          proofBody = '只有 ' + stats.partyKnown + ' / ' + stats.games + ' 场公开记录带有足够的组队人数。别把字段缺失误解成这些人没有一起排。';
          proofTone = 'muted';
        }

        var verdictTitle;
        var verdictBody;
        var verdictTone;
        if (stats.games < 20) {
          verdictTitle = '样本太少，先别封神，也别急着分锅';
          verdictBody = stats.games + ' 场比赛更像一张合影，不像一份判决书。现在最靠谱的结论只有：这组人确实一起出现过。';
          verdictTone = 'verdict muted';
        } else if (winratePct >= 55 && delta >= 0) {
          verdictTitle = '一句话：人齐了，分也真的能来';
          verdictBody = '长期胜率够硬，近期表现又没有掉队。这套组合不是只负责热闹，确实有稳定上分能力。';
          verdictTone = 'verdict good';
        } else if (winratePct >= 50) {
          verdictTitle = '一句话：能赢，但还没到闭眼选人的程度';
          verdictBody = '整体结果偏正向，不过优势没有大到可以无视阵容和状态。属于靠谱开黑，不属于版本答案。';
          verdictTone = 'verdict good';
        } else if (winratePct >= 47) {
          verdictTitle = '一句话：快乐和痛苦基本五五开';
          verdictBody = '这组人的价值更像“有人一起打”，而不是“组上就必涨分”。战绩普通，但开黑存在感很强。';
          verdictTone = 'verdict';
        } else if (delta >= 5) {
          verdictTitle = '一句话：历史欠了不少，最近开始还债';
          verdictBody = '长期战绩不好看，但最近胜率明显回升。至少趋势在往对的方向走，暂时不急着解散队伍。';
          verdictTone = 'verdict';
        } else {
          verdictTitle = '一句话：人齐了，不代表分就来了';
          verdictBody = '共同比赛不少，但胜率没有替这段友情争气。要么阵容长期不合理，要么大家真的更在意开黑，不太在意结算画面。';
          verdictTone = 'verdict dire';
        }

        target.innerHTML =
          commentCard('共同轨迹', activityTitle, activityBody, activityMeta, stats.games < 20 ? 'muted' : '') +
          commentCard('战绩气质', recordTitle, recordBody, stats.wins + ' 胜 · ' + stats.losses + ' 负 · ' + mode, recordTone) +
          commentCard('近期状态', recentTitle, recentBody, recentMeta, recentTone) +
          commentCard('英雄印记', heroTitle, heroBody, '括号内为该英雄在当前组合中的胜率', '') +
          commentCard('队内分工', 'KDA 已经把脏活和亮眼数据写出来了', roleBody, roleMeta, deathLead.deaths >= 10 ? 'dire' : '') +
          commentCard('证据硬度', proofTitle, proofBody, '组队人数字段缺失不影响“同场同阵营”的判断', proofTone) +
          commentCard('一句话锐评', verdictTitle, verdictBody, '基于当前组合的 ' + stats.games + ' 场公开共同比赛', verdictTone);
      }
      function renderYears(stats) {
        var byYear = {};
        stats.matches.forEach(function (record) {
          var year = yearOf(record.start_time);
          if (!byYear[year]) byYear[year] = { games: 0, wins: 0, duration: 0, first: null, last: null };
          byYear[year].games += 1;
          byYear[year].wins += winFor(record, stats.ids[0]) ? 1 : 0;
          byYear[year].duration += Number(record.duration || 0);
          if (!byYear[year].first || Number(record.start_time) < Number(byYear[year].first.start_time)) byYear[year].first = record;
          if (!byYear[year].last || Number(record.start_time) > Number(byYear[year].last.start_time)) byYear[year].last = record;
        });
        var years = Object.keys(byYear).sort();
        var max = Math.max.apply(null, years.map(function (year) { return byYear[year].games; }).concat([1]));
        var selectedYear = state.year && byYear[state.year] ? state.year : (years[years.length - 1] || null);
        state.year = selectedYear;
        document.getElementById('yearChart').innerHTML = years.length ? years.map(function (year) {
          var count = byYear[year].games;
          var height = Math.max(4, Math.round(count / max * 155));
          return '<div class="year-bar-wrap ' + (year === selectedYear ? 'selected' : '') + '" data-year="' + year + '" role="button" tabindex="0" aria-label="查看 ' + year + ' 年统计"><div class="year-bar" style="height:' + height + 'px"><span class="year-count">' + count + '</span></div><span class="year-label">' + year + '</span></div>';
        }).join('') : '<span class="muted">没有年度数据</span>';
        var detail = document.getElementById('yearDetail');
        if (!selectedYear) {
          detail.innerHTML = '<div class="muted">当前组合没有可显示的年度统计。</div>';
          return;
        }
        var item = byYear[selectedYear];
        var losses = item.games - item.wins;
        detail.innerHTML = '<div class="year-detail-head"><strong>' + selectedYear + ' 年</strong><span>点击其它年份柱子切换</span></div>' +
          '<div class="year-detail-grid">' +
            '<div class="year-detail-stat"><span>共同比赛</span><b>' + item.games + ' 场</b></div>' +
            '<div class="year-detail-stat"><span>战绩 / 胜率</span><b>' + item.wins + ' 胜 · ' + losses + ' 负 · ' + (item.wins / item.games * 100).toFixed(1) + '%</b></div>' +
            '<div class="year-detail-stat"><span>总时长 / 平均</span><b>' + formatHours(item.duration) + ' · ' + formatDuration(item.duration / item.games) + ' / 局</b></div>' +
            '<div class="year-detail-stat"><span>首场时间</span><b>' + dateTime(item.first.start_time) + '</b></div>' +
            '<div class="year-detail-stat"><span>末场时间</span><b>' + dateTime(item.last.start_time) + '</b></div>' +
          '</div>';
        document.querySelectorAll('[data-year]').forEach(function (bar) {
          bar.addEventListener('click', function () { state.year = bar.getAttribute('data-year'); renderYears(stats); });
          bar.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); state.year = bar.getAttribute('data-year'); renderYears(stats); } });
        });
      }
      function renderSignals(stats) {
        var first = stats.first;
        var firstGroupSizeKnown = first ? state.selected.every(function (id) { return first.players[id].partySize != null; }) : false;
        var firstGroupSizeEnough = first ? state.selected.every(function (id) { return Number(first.players[id].partySize) >= state.selected.length; }) : false;
        document.getElementById('signalGrid').innerHTML =
          '<div class="signal"><span class="signal-label">同时出现（不分阵营）</span><strong class="signal-value">' + stats.allPresent.toLocaleString('en-US') + ' 场</strong></div>' +
          '<div class="signal"><span class="signal-label">同阵营共同比赛</span><strong class="signal-value good">' + stats.games.toLocaleString('en-US') + ' 场</strong></div>' +
          '<div class="signal"><span class="signal-label">公开组队人数足够的场次</span><strong class="signal-value ' + (stats.partyKnown ? 'good' : 'warn') + '">' + stats.partyKnown + ' / ' + stats.games + '</strong></div>' +
          '<div class="signal"><span class="signal-label">首场的组队人数记录</span><strong class="signal-value">' + (firstGroupSizeKnown ? (firstGroupSizeEnough ? '满足人数' : '不足 / 不一致') : '缺失') + '</strong></div>';
        document.getElementById('qualityNote').innerHTML = '<b>为什么可能没有首场时间：</b>如果某个组合显示“未查到”，表示当前公开快照没有返回这组账号同时同阵营的记录，不等同于确定没有一起玩过。组队人数只是列表里的辅助字段，很多老比赛为空，不能替代完整的队伍编号。';
      }
      function renderHeroes(stats) {
        document.getElementById('heroGrid').innerHTML = stats.ids.map(function (id) {
          var p = player(id);
          var heroStats = {};
          stats.matches.forEach(function (record) {
            var row = record.players[id];
            if (!row) return;
            var key = String(row.hero_id);
            if (!heroStats[key]) heroStats[key] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
            heroStats[key].games += 1;
            heroStats[key].wins += winFor(record, id) ? 1 : 0;
            heroStats[key].kills += Number(row.kills || 0);
            heroStats[key].deaths += Number(row.deaths || 0);
            heroStats[key].assists += Number(row.assists || 0);
          });
          var list = Object.keys(heroStats).sort(function (a, b) { return heroStats[b].games - heroStats[a].games; });
          var roleCount = { 核心: 0, 辅助: 0, 混合: 0 };
          list.forEach(function (heroId) {
            var roles = hero(heroId).roles || [];
            if (roles.indexOf('Carry') >= 0 && roles.indexOf('Support') >= 0) roleCount.混合 += heroStats[heroId].games;
            else if (roles.indexOf('Carry') >= 0) roleCount.核心 += heroStats[heroId].games;
            else roleCount.辅助 += heroStats[heroId].games;
          });
          var total = roleCount.核心 + roleCount.辅助 + roleCount.混合 || 1;
          return '<div class="hero-column">' +
            '<div class="hero-column-head">' + avatarHtml(p) + '<div><strong>' + esc(p.name) + '</strong><span>' + stats.games + ' 场共同比赛</span></div></div>' +
            '<div class="role-lens">' +
              ['核心', '辅助', '混合'].map(function (role) {
                var percent = Math.round(roleCount[role] / total * 100);
                return '<div class="role-row"><span>' + role + '</span><div class="role-track"><div class="role-fill" style="width:' + percent + '%"></div></div><span>' + percent + '%</span></div>';
              }).join('') +
            '</div>' +
            '<div class="hero-list">' + (list.length ? list.slice(0, 7).map(function (heroId) {
              var h = hero(heroId);
              var s = heroStats[heroId];
              var wr = s.wins / s.games * 100;
              return '<div class="hero-row"><img src="' + heroImageUrl(h) + '" alt="" onerror="this.style.opacity=.08"><div class="hero-row-name"><strong>' + esc(h.name) + '</strong><span>' + s.kills.toFixed(1) + ' / ' + s.deaths.toFixed(1) + ' / ' + s.assists.toFixed(1) + ' avg</span></div><div class="hero-row-stat">' + s.games + ' 场 · <b>' + wr.toFixed(1) + '%</b></div></div>';
            }).join('') : '<div class="muted">暂无英雄记录</div>') + '</div></div>';
        }).join('');
      }
      function renderMatchItem(record, ids, index) {
        var result = winFor(record, ids[0]);
        var heroesHtml = ids.map(function (id) {
          var h = hero(record.players[id].hero_id);
          return '<img class="mini-hero" src="' + heroImageUrl(h) + '" alt="' + esc(h.name) + '" title="' + esc(player(id).name + ' · ' + h.name) + '" onerror="this.style.opacity=.08">';
        }).join('');
        return '<div class="match-item"><span class="match-node">' + String(index + 1).padStart(2, '0') + '</span><div class="match-main"><strong>' + dateTime(record.start_time) + '</strong><span>比赛 ' + esc(record.match_id) + ' · ' + formatDuration(record.duration) + '</span><div class="match-heroes">' + heroesHtml + '</div></div><strong class="match-result ' + (result ? '' : 'loss') + '">' + (result ? '胜' : '负') + '</strong></div>';
      }
      function renderTimeline(stats) {
        var first = stats.matches.slice(0, 5);
        document.getElementById('timelineTitle').textContent = stats.first ? '第一次一起出现的比赛' : '没有可显示的首场记录';
        document.getElementById('timeline').innerHTML = first.length ? first.map(function (record, i) { return renderMatchItem(record, stats.ids, i); }).join('') : '<div class="muted">当前公开快照没有返回这组账号同时同阵营的比赛，因此没有首场时间；这不等同于确定没有一起玩过。</div>';
      }
      function findStreak(matches, win) {
        var best = { length: 0, start: null, end: null };
        var current = [];
        matches.forEach(function (record) {
          var isWin = winFor(record, state.selected[0]);
          if (isWin === win) current.push(record);
          else {
            if (current.length > best.length) best = { length: current.length, start: current[0], end: current[current.length - 1] };
            current = [];
          }
        });
        if (current.length > best.length) best = { length: current.length, start: current[0], end: current[current.length - 1] };
        return best;
      }
      function renderStreaks(stats) {
        var win = findStreak(stats.matches, true);
        var loss = findStreak(stats.matches, false);
        function row(label, item, good) {
          var detail = item.length ? item.length + ' 场 · ' + dateOnly(item.start.start_time) + ' → ' + dateOnly(item.end.start_time) : '暂无';
          return '<div class="signal"><span class="signal-label">' + label + '</span><strong class="signal-value ' + (good ? 'good' : 'warn') + '">' + detail + '</strong></div>';
        }
        document.getElementById('streaks').innerHTML = row('最长连胜', win, true) + row('最长连败', loss, false) + '<div class="signal"><span class="signal-label">最近一场</span><strong class="signal-value">' + (stats.last ? dateTime(stats.last.start_time, true) : '—') + '</strong></div>';
      }
      function render() {
        var stats = getStats(state.selected);
        renderRoster();
        renderKpis(stats);
        renderMembers(stats);
        renderCommentary(stats);
        renderYears(stats);
        renderSignals(stats);
        renderHeroes(stats);
        renderTimeline(stats);
        renderStreaks(stats);
        document.getElementById('snapshot').textContent = DATA.meta.shared_records.toLocaleString('en-US') + ' 条共同比赛记录';
        document.getElementById('selectorSnapshot').innerHTML = '已验证 ' + DATA.meta.profile_verified + ' / ' + IDS.length + ' 个公开资料名<br><b>本地已嵌入 ' + DATA.meta.shared_records.toLocaleString('en-US') + ' 条共同记录</b>';
      }
      document.querySelectorAll('[data-preset]').forEach(function (button) {
        button.addEventListener('click', function () { setSelection(IDS.slice(0, Number(button.getAttribute('data-preset')))); });
      });
      document.getElementById('playerSelectGrid').addEventListener('change', function (event) {
        var input = event.target.closest('[data-player-check]');
        if (!input) return;
        var id = input.getAttribute('data-player-check');
        var next = state.selected.slice();
        if (input.checked && next.indexOf(id) < 0) next.push(id);
        if (!input.checked) next = next.filter(function (item) { return item !== id; });
        if (next.length < 2) { input.checked = true; return; }
        state.selected = IDS.filter(function (item) { return next.indexOf(item) >= 0; });
        state.year = null;
        render();
      });
      document.getElementById('refreshProfiles').addEventListener('click', async function () {
        var status = document.getElementById('refreshStatus');
        status.textContent = '正在尝试连接 OpenDota…';
        try {
          var results = await Promise.all(IDS.map(async function (id) { var response = await fetch('https://api.opendota.com/api/players/' + id); return { id: id, body: await response.json() }; }));
          results.forEach(function (item) {
            var profile = item.body && item.body.profile;
            if (profile && profile.personaname) {
              DATA.players[item.id].name = profile.personaname;
              DATA.players[item.id].avatar = profile.avatarfull || DATA.players[item.id].avatar;
              DATA.players[item.id].profileurl = profile.profileurl || DATA.players[item.id].profileurl;
            }
          });
          render();
          status.textContent = '已刷新 ' + results.filter(function (item) { return item.body && item.body.profile && item.body.profile.personaname; }).length + ' / ' + IDS.length + ' 个资料名';
        } catch (error) {
          status.textContent = '本地 file:// 环境未允许跨域刷新，保留已嵌入资料名';
        }
      });
      document.getElementById('fetchedAt').textContent = dateTime(new Date(DATA.meta.fetched_at).getTime() / 1000);
      render();
    }());
  </script>
</body>
</html>`.replace('__DATA_PAYLOAD__', payload);
  return html;
}

function loadLegacyData(ids) {
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 5) {
    throw new Error('请通过 DEMO_IDS 提供 2–5 个逗号分隔账号，例如 DEMO_IDS=123456789,987654321');
  }
  const bundles = {};
  for (const id of ids) bundles[id] = JSON.parse(fs.readFileSync(path.join(ROOT, 'od_' + id + '.json'), 'utf8'));
  return buildData({
    ids,
    bundles,
    heroesRaw: JSON.parse(fs.readFileSync(path.join(ROOT, 'od_heroes.json'), 'utf8')),
    officialHeroNames: JSON.parse(fs.readFileSync(path.join(ROOT, 'official_hero_names.json'), 'utf8')),
    defaultSelection: ids.slice(0, 2)
  });
}

if (require.main === module) {
  const outputPath = path.join(ROOT, '..', 'outputs', 'dota_party_life_2_5.html');
  const demoIds = String(process.env.DEMO_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
  const data = loadLegacyData(demoIds);
  const html = renderReport(data);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(JSON.stringify({
    output: outputPath,
    bytes: Buffer.byteLength(html),
    canonical_matches: data.meta.canonical_matches,
    shared_records: data.meta.shared_records,
    profile_verified: data.meta.profile_verified
  }, null, 2));
}

module.exports = { buildData, renderReport };
