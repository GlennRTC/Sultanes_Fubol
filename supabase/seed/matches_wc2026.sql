-- Seed: matches_wc2026
-- All 72 WC 2026 group-stage matches. Times are UTC (EDT + 4h).
-- Groups A–L (12 groups × 6 matches = 72). VERIFY times against official FIFA schedule before production run.

insert into public.matches (home_team, away_team, group_name, match_datetime, status)
values
  -- ============================================================
  -- Groups A–D (June 11–20)
  -- ============================================================
  ('México',              'Sudáfrica',              'A', '2026-06-11 19:00:00+00', 'scheduled'),
  ('Corea del Sur',       'Chequia',                'A', '2026-06-12 02:00:00+00', 'scheduled'),
  ('Canadá',              'Bosnia y Herzegovina',   'B', '2026-06-12 19:00:00+00', 'scheduled'),
  ('Estados Unidos',      'Paraguay',               'D', '2026-06-13 01:00:00+00', 'scheduled'),
  ('Catar',               'Suiza',                  'B', '2026-06-13 19:00:00+00', 'scheduled'),
  ('Brasil',              'Marruecos',              'C', '2026-06-13 22:00:00+00', 'scheduled'),
  ('Haití',               'Escocia',                'C', '2026-06-14 01:00:00+00', 'scheduled'),
  ('Australia',           'Turquía',                'D', '2026-06-14 04:00:00+00', 'scheduled'),
  ('Alemania',            'Curazao',                'E', '2026-06-14 17:00:00+00', 'scheduled'),
  ('Países Bajos',        'Japón',                  'F', '2026-06-14 20:00:00+00', 'scheduled'),
  ('Costa de Marfil',     'Ecuador',                'E', '2026-06-14 23:00:00+00', 'scheduled'),
  ('Suecia',              'Túnez',                  'F', '2026-06-15 02:00:00+00', 'scheduled'),
  ('España',              'Cabo Verde',             'H', '2026-06-15 17:00:00+00', 'scheduled'),
  ('Bélgica',             'Egipto',                 'G', '2026-06-15 22:00:00+00', 'scheduled'),
  ('Arabia Saudita',      'Uruguay',                'H', '2026-06-15 22:00:00+00', 'scheduled'),
  ('Irán',                'Nueva Zelanda',          'G', '2026-06-16 04:00:00+00', 'scheduled'),
  -- ============================================================
  -- Groups I–L (June 16–18 first round)
  -- ============================================================
  ('Francia',             'Senegal',                'I', '2026-06-16 19:00:00+00', 'scheduled'),
  ('Irak',                'Noruega',                'I', '2026-06-16 22:00:00+00', 'scheduled'),
  ('Argentina',           'Argelia',                'J', '2026-06-17 01:00:00+00', 'scheduled'),
  ('Austria',             'Jordania',               'J', '2026-06-17 04:00:00+00', 'scheduled'),
  ('Portugal',            'Rep. Dem. del Congo',    'K', '2026-06-17 17:00:00+00', 'scheduled'),
  ('Inglaterra',          'Croacia',                'L', '2026-06-17 20:00:00+00', 'scheduled'),
  ('Ghana',               'Panamá',                 'L', '2026-06-17 23:00:00+00', 'scheduled'),
  ('Uzbekistán',          'Colombia',               'K', '2026-06-18 02:00:00+00', 'scheduled'),
  -- ============================================================
  -- Second round: Groups A–D (June 18–20)
  -- ============================================================
  ('Chequia',             'Sudáfrica',              'A', '2026-06-18 16:00:00+00', 'scheduled'),
  ('Suiza',               'Bosnia y Herzegovina',   'B', '2026-06-18 19:00:00+00', 'scheduled'),
  ('Canadá',              'Catar',                  'B', '2026-06-18 22:00:00+00', 'scheduled'),
  ('México',              'Corea del Sur',          'A', '2026-06-19 03:00:00+00', 'scheduled'),
  ('Estados Unidos',      'Australia',              'D', '2026-06-19 19:00:00+00', 'scheduled'),
  ('Escocia',             'Marruecos',              'C', '2026-06-19 22:00:00+00', 'scheduled'),
  ('Brasil',              'Haití',                  'C', '2026-06-20 01:00:00+00', 'scheduled'),
  ('Turquía',             'Paraguay',               'D', '2026-06-20 04:00:00+00', 'scheduled'),
  -- ============================================================
  -- Second round: Groups E–H (June 20–22)
  -- ============================================================
  ('Países Bajos',        'Suecia',                 'F', '2026-06-20 17:00:00+00', 'scheduled'),
  ('Alemania',            'Costa de Marfil',        'E', '2026-06-20 20:00:00+00', 'scheduled'),
  ('Ecuador',             'Curazao',                'E', '2026-06-21 00:00:00+00', 'scheduled'),
  ('Túnez',               'Japón',                  'F', '2026-06-21 04:00:00+00', 'scheduled'),
  ('España',              'Arabia Saudita',         'H', '2026-06-21 16:00:00+00', 'scheduled'),
  ('Bélgica',             'Irán',                   'G', '2026-06-21 19:00:00+00', 'scheduled'),
  ('Uruguay',             'Cabo Verde',             'H', '2026-06-21 22:00:00+00', 'scheduled'),
  ('Nueva Zelanda',       'Egipto',                 'G', '2026-06-22 01:00:00+00', 'scheduled'),
  -- ============================================================
  -- Second round: Groups I–L (June 22–24)
  -- ============================================================
  ('Argentina',           'Austria',                'J', '2026-06-22 17:00:00+00', 'scheduled'),
  ('Francia',             'Irak',                   'I', '2026-06-22 21:00:00+00', 'scheduled'),
  ('Noruega',             'Senegal',                'I', '2026-06-23 00:00:00+00', 'scheduled'),
  ('Jordania',            'Argelia',                'J', '2026-06-23 03:00:00+00', 'scheduled'),
  ('Portugal',            'Uzbekistán',             'K', '2026-06-23 17:00:00+00', 'scheduled'),
  ('Inglaterra',          'Ghana',                  'L', '2026-06-23 20:00:00+00', 'scheduled'),
  ('Panamá',              'Croacia',                'L', '2026-06-23 23:00:00+00', 'scheduled'),
  ('Colombia',            'Rep. Dem. del Congo',    'K', '2026-06-24 02:00:00+00', 'scheduled'),
  -- ============================================================
  -- Third round (decisive): Groups A–D (June 24–26)
  -- ============================================================
  ('Suiza',               'Canadá',                 'B', '2026-06-24 19:00:00+00', 'scheduled'),
  ('Bosnia y Herzegovina','Catar',                  'B', '2026-06-24 19:00:00+00', 'scheduled'),
  ('Escocia',             'Brasil',                 'C', '2026-06-24 22:00:00+00', 'scheduled'),
  ('Marruecos',           'Haití',                  'C', '2026-06-24 22:00:00+00', 'scheduled'),
  ('Chequia',             'México',                 'A', '2026-06-25 01:00:00+00', 'scheduled'),
  ('Sudáfrica',           'Corea del Sur',          'A', '2026-06-25 01:00:00+00', 'scheduled'),
  ('Ecuador',             'Alemania',               'E', '2026-06-25 20:00:00+00', 'scheduled'),
  ('Curazao',             'Costa de Marfil',        'E', '2026-06-25 20:00:00+00', 'scheduled'),
  ('Japón',               'Suecia',                 'F', '2026-06-25 23:00:00+00', 'scheduled'),
  ('Túnez',               'Países Bajos',           'F', '2026-06-25 23:00:00+00', 'scheduled'),
  ('Turquía',             'Estados Unidos',         'D', '2026-06-26 02:00:00+00', 'scheduled'),
  ('Paraguay',            'Australia',              'D', '2026-06-26 02:00:00+00', 'scheduled'),
  -- ============================================================
  -- Third round (decisive): Groups I–L (June 26–28)
  -- ============================================================
  ('Noruega',             'Francia',                'I', '2026-06-26 19:00:00+00', 'scheduled'),
  ('Senegal',             'Irak',                   'I', '2026-06-26 19:00:00+00', 'scheduled'),
  ('Cabo Verde',          'Arabia Saudita',         'H', '2026-06-27 00:00:00+00', 'scheduled'),
  ('Uruguay',             'España',                 'H', '2026-06-27 00:00:00+00', 'scheduled'),
  ('Egipto',              'Irán',                   'G', '2026-06-27 03:00:00+00', 'scheduled'),
  ('Nueva Zelanda',       'Bélgica',                'G', '2026-06-27 03:00:00+00', 'scheduled'),
  ('Panamá',              'Inglaterra',             'L', '2026-06-27 21:00:00+00', 'scheduled'),
  ('Croacia',             'Ghana',                  'L', '2026-06-27 21:00:00+00', 'scheduled'),
  ('Colombia',            'Portugal',               'K', '2026-06-27 23:30:00+00', 'scheduled'),
  ('Rep. Dem. del Congo', 'Uzbekistán',             'K', '2026-06-27 23:30:00+00', 'scheduled'),
  ('Argelia',             'Austria',                'J', '2026-06-28 02:00:00+00', 'scheduled'),
  ('Jordania',            'Argentina',              'J', '2026-06-28 02:00:00+00', 'scheduled')
;
