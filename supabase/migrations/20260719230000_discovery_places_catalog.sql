-- Catalogue « lieux à découvrir » :
-- - les salles OpenAgenda (cultural_venue) restent liées aux événements
--   mais sont exclues d’Explorer / recherche lieux par défaut ;
-- - list_public_places trie par proximité si lat/lng fournis ;
-- - seed éditorial TouRose : lieux symboliques, parcs, coins & bons plans.

create or replace function public.is_discovery_place_type(place_type_value text)
returns boolean
language sql
immutable
as $$
  select place_type_value in (
    'monument',
    'museum',
    'square',
    'park',
    'walk',
    'viewpoint',
    'activity',
    'historical_site',
    'permanent_tip'
  );
$$;

revoke all on function public.is_discovery_place_type(text) from public;
grant execute on function public.is_discovery_place_type(text) to anon, authenticated, service_role;

drop function if exists public.list_public_places(integer);

create or replace function public.list_public_places(
  limit_count integer default 50,
  origin_latitude double precision default null,
  origin_longitude double precision default null,
  discovery_only boolean default true
)
returns setof public.public_places
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with origin_point as (
    select case
      when origin_latitude is not null and origin_longitude is not null then
        extensions.st_setsrid(
          extensions.st_makepoint(origin_longitude, origin_latitude),
          4326
        )::extensions.geography
      else null
    end as geography_point
  )
  select place_row.*
  from public.public_places place_row
  cross join origin_point
  where (
    not discovery_only
    or public.is_discovery_place_type(place_row.place_type)
  )
  order by
    case
      when origin_point.geography_point is not null
        and place_row.latitude is not null
        and place_row.longitude is not null
      then extensions.st_distance(
        extensions.st_setsrid(
          extensions.st_makepoint(place_row.longitude, place_row.latitude),
          4326
        )::extensions.geography,
        origin_point.geography_point
      )
      else null
    end asc nulls last,
    place_row.name asc
  limit greatest(limit_count, 1);
$$;

revoke all on function public.list_public_places(integer, double precision, double precision, boolean) from public;
grant execute on function public.list_public_places(integer, double precision, double precision, boolean)
  to anon, authenticated, service_role;

create or replace function public.search_public_catalog(
  search_query text,
  result_limit integer default 20
)
returns table (
  entity_type text,
  id uuid,
  slug text,
  title text,
  summary text,
  rank real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with normalized as (
    select nullif(trim(search_query), '') as query_text
  ),
  event_hits as (
    select
      'event'::text as entity_type,
      event_row.id,
      event_row.slug,
      event_row.title,
      event_row.summary,
      greatest(
        similarity(
          extensions.unaccent(lower(event_row.title)),
          extensions.unaccent(lower((select query_text from normalized)))
        ),
        similarity(
          extensions.unaccent(lower(coalesce(event_row.summary, ''))),
          extensions.unaccent(lower((select query_text from normalized)))
        )
      ) as rank
    from public.events event_row
    cross join normalized
    where event_row.status = 'published'
      and normalized.query_text is not null
      and (
        extensions.unaccent(lower(event_row.title))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(coalesce(event_row.summary, '')))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(event_row.title))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
        or extensions.unaccent(lower(coalesce(event_row.summary, '')))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
      )
  ),
  place_hits as (
    select
      'place'::text as entity_type,
      place_row.id,
      place_row.slug,
      place_row.name as title,
      place_row.summary,
      greatest(
        similarity(
          extensions.unaccent(lower(place_row.name)),
          extensions.unaccent(lower((select query_text from normalized)))
        ),
        similarity(
          extensions.unaccent(lower(coalesce(place_row.summary, ''))),
          extensions.unaccent(lower((select query_text from normalized)))
        )
      ) as rank
    from public.places place_row
    cross join normalized
    where place_row.status = 'published'
      and public.is_discovery_place_type(place_row.place_type)
      and normalized.query_text is not null
      and (
        extensions.unaccent(lower(place_row.name))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(coalesce(place_row.summary, '')))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(place_row.name))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
        or extensions.unaccent(lower(coalesce(place_row.summary, '')))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
      )
  )
  select *
  from (
    select * from event_hits
    union all
    select * from place_hits
  ) catalog_hits
  order by rank desc, title asc
  limit greatest(result_limit, 1);
$$;

-- Source éditoriale TouRose (catalogue découverte).
insert into public.sources (
  id,
  name,
  kind,
  base_url,
  license_name,
  license_url,
  attribution_template,
  is_active
)
values (
  '22222222-2222-2222-2222-222222222203',
  'TouRose Editorial Places',
  'editorial',
  'https://tourose.app',
  'Contenu éditorial TouRose',
  null,
  'Sélection TouRose — {title}',
  true
)
on conflict (id) do nothing;

-- Seed lieux découverte (textes originaux TouRose, faits publics).
insert into public.places (
  id,
  territory_id,
  slug,
  name,
  summary,
  description,
  place_type,
  location,
  address,
  postal_code,
  city,
  website_url,
  price_type,
  price_details,
  indoor_outdoor,
  recommended_duration_minutes,
  family_friendly,
  dog_friendly,
  accessible,
  details,
  status,
  published_at,
  last_verified_at
)
values
(
  'a1000000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'place-du-capitole',
  'Place du Capitole',
  'Le cœur battant de Toulouse : façade rose, terrasses et croix occitane au sol.',
  E'Impossible de rater la Place du Capitole. Le bâtiment du Capitole (mairie) domine la place avec sa longue façade rose. Au centre, la croix occitane mosaïque sert de point de rendez-vous classique.\n\nIdéal pour commencer une balade centre-ville, prendre un café en terrasse ou simplement observer le passage. Le soir, la place s’illumine et reste animée.',
  'square',
  extensions.st_setsrid(extensions.st_makepoint(1.444279, 43.604482), 4326)::extensions.geography,
  'Place du Capitole',
  '31000',
  'Toulouse',
  'https://www.toulouse-tourisme.com',
  'free',
  'Accès libre à la place',
  'outdoor',
  45,
  true,
  true,
  true,
  '{"tips":["Regardez la croix occitane au sol pour vous orienter.","Enchaînez avec la rue du Taur vers Saint-Sernin."],"best_moment":"Fin d’après-midi et soirée","access":"Métro Capitole (A)"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'basilique-saint-sernin',
  'Basilique Saint-Sernin',
  'La plus grande église romane d’Europe : briques roses, clocher et serénité absolue.',
  E'Saint-Sernin est un monument incontournable. L’extérieur en brique rose et le clocher octogonal se voient de loin. À l’intérieur, la lumière et les chapelles offrent une pause calme au milieu du centre.\n\nPrenez le temps de faire le tour du chevet et de la place. Le quartier autour (rue du Taur, place Saint-Sernin) est parfait pour prolonger la visite à pied.',
  'monument',
  extensions.st_setsrid(extensions.st_makepoint(1.441944, 43.608333), 4326)::extensions.geography,
  'Place Saint-Sernin',
  '31000',
  'Toulouse',
  'https://www.basilique-saint-sernin.fr',
  'free',
  'Visite libre de l’édifice ; offres guidées possibles',
  'mixed',
  60,
  true,
  false,
  true,
  '{"tips":["Le matin est plus calme pour photographier le clocher.","Combinez avec le Musée Saint-Raymond juste à côté."],"best_moment":"Matin en semaine","access":"Métro Capitole puis 8–10 min à pied"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'couvent-des-jacobins',
  'Couvent des Jacobins',
  'Chef-d’œuvre gothique méridional et le célèbre « palmier » de pierre.',
  E'Les Jacobins impressionnent par leur nef et surtout par le pilier « palmier » qui déploie ses nervures comme un éventail. Le cloître offre un moment de calme rare en centre-ville.\n\nUne visite courte mais marquante, idéale entre deux flâneries côté Carmes / Saint-Étienne.',
  'historical_site',
  extensions.st_setsrid(extensions.st_makepoint(1.4400, 43.6036), 4326)::extensions.geography,
  'Place des Jacobins',
  '31000',
  'Toulouse',
  'https://www.jacobins.toulouse.fr',
  'paid',
  'Tarif d’entrée selon période ; vérifiez sur le site officiel',
  'indoor',
  75,
  true,
  false,
  true,
  '{"tips":["Prenez un billet combiné si vous enchaînez avec d’autres sites municipaux.","Le cloître est parfait pour une pause à l’ombre."],"best_moment":"Milieu de journée","access":"Métro Esquirol ou Capitole"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'musee-des-augustins',
  'Musée des Augustins',
  'Beaux-arts dans un ancien couvent : sculptures, peintures et jardin cloîtré.',
  E'Installé dans un ancien couvent, le Musée des Augustins mêle architecture et collections. Les salles de sculptures et le cloître verdoyant en font une visite culturelle très « Toulousaine ».\n\nPrévoyez une heure à une heure et demie, puis prolongez vers Saint-Étienne ou les Carmes.',
  'museum',
  extensions.st_setsrid(extensions.st_makepoint(1.4469, 43.6008), 4326)::extensions.geography,
  '21 Rue de Metz',
  '31000',
  'Toulouse',
  'https://www.augustins.org',
  'paid',
  'Entrée payante ; jours gratuits selon la politique municipale',
  'indoor',
  90,
  true,
  false,
  true,
  '{"tips":["Vérifiez les jours de gratuité municipale.","Le jardin du cloître est un vrai bonus."],"best_moment":"Après-midi","access":"Métro Esquirol"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000005',
  '11111111-1111-1111-1111-111111111111',
  'musee-saint-raymond',
  'Musée Saint-Raymond',
  'Archéologie toulousaine face à Saint-Sernin : antiquité et sous-sols fascinants.',
  E'Face à la basilique, le Musée Saint-Raymond raconte la Toulouse antique. Les collections de sculptures et les espaces souterrains valent vraiment le détour si vous aimez l’histoire.\n\nCourt, dense, parfaitement complémentaire d’une visite de Saint-Sernin.',
  'museum',
  extensions.st_setsrid(extensions.st_makepoint(1.4412, 43.6086), 4326)::extensions.geography,
  '1 Bis Place Saint-Sernin',
  '31000',
  'Toulouse',
  'https://www.saintraymond.toulouse.fr',
  'paid',
  'Entrée payante ; offres combinées possibles',
  'indoor',
  75,
  true,
  false,
  true,
  '{"tips":["Parfait en duo avec Saint-Sernin.","Demandez le parcours des sous-sols."],"best_moment":"Matin","access":"Métro Capitole"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000006',
  '11111111-1111-1111-1111-111111111111',
  'jardin-des-plantes',
  'Jardin des Plantes',
  'Grand parc historique : allées ombragées, muséum à proximité et pause familiale.',
  E'Le Jardin des Plantes est l’un des poumons verts du centre élargi. Allées, pelouses et coins d’ombre en font une option idéale dès qu’il fait chaud.\n\nVous pouvez enchaîner avec le Grand Rond et le Jardin Royal pour une longue promenade « trois jardins ».',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4506, 43.5933), 4326)::extensions.geography,
  'Allée Jules Guesde',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  90,
  true,
  true,
  true,
  '{"tips":["Enchaînez Grand Rond + Jardin Royal.","Très agréable après une matinée musée."],"best_moment":"Matin ou fin de journée","access":"Métro Palais de Justice / bus allée Jules Guesde"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000007',
  '11111111-1111-1111-1111-111111111111',
  'jardin-du-grand-rond',
  'Jardin du Grand Rond',
  'Écrin circulaire élégant entre Jardin des Plantes et Jardin Royal.',
  E'Plus formel que le Jardin des Plantes, le Grand Rond séduit par son dessin circulaire, ses statues et son ambiance « belle promenade ».\n\nParfait pour une pause courte ou pour relier les jardins voisins sans reprendre les grands axes.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4525, 43.5950), 4326)::extensions.geography,
  'Grand Rond',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  40,
  true,
  true,
  true,
  '{"tips":["Idéal pour une pause photo.","Continuez vers le Jardin Royal."],"best_moment":"Fin d’après-midi","access":"À pied depuis Palais de Justice"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000008',
  '11111111-1111-1111-1111-111111111111',
  'prairie-des-filtres',
  'Prairie des Filtres',
  'Pelouse au bord de la Garonne : pique-nique, rollers et couchers de soleil.',
  E'Entre le Pont Neuf et le Pont Saint-Michel, la Prairie des Filtres est le classique toulousain du week-end. On s’y étend sur l’herbe, on regarde la Garonne, on boit un verre aux guinguettes selon la saison.\n\nEmportez une couverture : c’est le spot détente par excellence quand il fait beau.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4365, 43.5980), 4326)::extensions.geography,
  'Allée des Roucous',
  '31300',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  120,
  true,
  true,
  true,
  '{"tips":["Coucher de soleil très réussi côté Garonne.","Combinez avec une balade jusqu’au Pont Neuf."],"best_moment":"Soirée ensoleillée","access":"Métro Carmes puis marche vers la Garonne"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000009',
  '11111111-1111-1111-1111-111111111111',
  'jardin-japonais-compans',
  'Jardin japonais de Compans-Caffarelli',
  'Petit jardin zen gratuit : lac, pont rouge et ambiance dépaysante en ville.',
  E'Ce jardin japonais est une bulle. Lac, lanterne, pont et végétation soignée : on s’y sent ailleurs en quelques minutes.\n\nCourt mais mémorable — idéal entre deux rendez-vous côté Compans ou avant une pause bureau.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4339, 43.6115), 4326)::extensions.geography,
  'Jardin Compans Caffarelli',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  45,
  true,
  false,
  true,
  '{"tips":["Très photogénique après la pluie.","Respectez le calme du lieu : c’est un jardin contemplatif."],"best_moment":"Matin en semaine","access":"Métro Compans-Caffarelli (B)"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000000a',
  '11111111-1111-1111-1111-111111111111',
  'quais-de-la-garonne',
  'Quais de la Garonne (Daurade → Saint-Pierre)',
  'Balade signature le long de l’eau : briques, ponts et lumière du Sud-Ouest.',
  E'Une des plus belles promenades de Toulouse. Partez de la Daurade, longez les quais jusqu’à Saint-Pierre : façades roses, Pont Neuf, animation étudiante.\n\nAu soleil couchant, la brique devient vraiment « rose ». Prévoyez des chaussures confortables et aucun plan précis : le but, c’est de flâner.',
  'walk',
  extensions.st_setsrid(extensions.st_makepoint(1.4348, 43.6009), 4326)::extensions.geography,
  'Quai de la Daurade',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  75,
  true,
  true,
  true,
  '{"tips":["Golden hour magique.","Faites demi-tour via le Pont Neuf pour voir l’autre rive."],"best_moment":"Fin d’après-midi","access":"Métro Esquirol / Carmes"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000000b',
  '11111111-1111-1111-1111-111111111111',
  'pont-neuf-toulouse',
  'Pont Neuf',
  'Le plus ancien pont de Toulouse : vue Garonne et silhouette rose de la ville.',
  E'Malgré son nom, le Pont Neuf est historique. Traverser à pied offre l’une des plus belles perspectives sur la Garonne et les quais.\n\nArrêtez-vous au milieu pour la photo classique, puis continuez vers la Prairie des Filtres ou remontez vers la Daurade.',
  'monument',
  extensions.st_setsrid(extensions.st_makepoint(1.4360, 43.5994), 4326)::extensions.geography,
  'Pont Neuf',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  20,
  true,
  true,
  true,
  '{"tips":["Photo au milieu du pont, face aval.","Parfait en enchaînement quais + Prairie des Filtres."],"best_moment":"Coucher de soleil","access":"À pied depuis Carmes / Esquirol"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000000c',
  '11111111-1111-1111-1111-111111111111',
  'les-abattoirs',
  'Les Abattoirs',
  'Art moderne et contemporain dans d’anciens abattoirs, face à la Garonne.',
  E'Les Abattoirs mélangent architecture industrielle et collections d’art contemporain. Le site, côté rive gauche, se prête aussi à une balade autour du lieu.\n\nVérifiez l’exposition du moment : la programmation change et justifie souvent une visite dédiée.',
  'museum',
  extensions.st_setsrid(extensions.st_makepoint(1.4286, 43.6003), 4326)::extensions.geography,
  '76 Allées Charles de Fitte',
  '31300',
  'Toulouse',
  'https://www.lesabattoirs.org',
  'paid',
  'Entrée payante selon exposition',
  'indoor',
  90,
  true,
  false,
  true,
  '{"tips":["Regardez le programme d’expositions avant d’y aller.","Combinez avec une marche sur les quais rive gauche."],"best_moment":"Après-midi","access":"Tram / bus côté Saint-Cyprien"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000000d',
  '11111111-1111-1111-1111-111111111111',
  'cite-de-lespace',
  'Cité de l’Espace',
  'Parc ludique autour de l’espace : fusées, planète et activités famille.',
  E'La Cité de l’Espace est le grand classique famille / passionnés de cosmos. Extérieurs spectaculaires (fusées) et salles immersives.\n\nPrévoyez une demi-journée minimum. Moins « centre historique », plus « sortie journée » — très toulousain malgré tout.',
  'activity',
  extensions.st_setsrid(extensions.st_makepoint(1.4930, 43.5867), 4326)::extensions.geography,
  'Avenue Jean Gonord',
  '31500',
  'Toulouse',
  'https://www.cite-espace.com',
  'paid',
  'Billet d’entrée obligatoire',
  'mixed',
  240,
  true,
  false,
  true,
  '{"tips":["Réservez aux périodes scolaires.","Prévoyez 3–4 h minimum."],"best_moment":"Journée complète","access":"Lignes de bus dédiées / voiture"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000000e',
  '11111111-1111-1111-1111-111111111111',
  'halle-de-la-machine',
  'Halle de la Machine',
  'Machines spectaculaires et démonstrations : un lieu unique, presque théâtral.',
  E'La Halle de la Machine surprend toujours. Entre atelier et spectacle, on y découvre des machines monumentales dans une ambiance industrielle.\n\nVérifiez les horaires de démonstration : c’est souvent le clou de la visite.',
  'activity',
  extensions.st_setsrid(extensions.st_makepoint(1.4195, 43.5708), 4326)::extensions.geography,
  '3 Avenue Edouard Belin',
  '31400',
  'Toulouse',
  'https://www.halledelamachine.fr',
  'paid',
  'Entrée payante ; démos selon planning',
  'indoor',
  90,
  true,
  false,
  true,
  '{"tips":["Visez une séance avec démonstration.","Secteur Montaudran / piste : prévoir le trajet."],"best_moment":"Week-end","access":"Bus / tram secteur Montaudran"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000000f',
  '11111111-1111-1111-1111-111111111111',
  'belvedere-pech-david',
  'Belvédère de Pech David',
  'Vue panoramique sur Toulouse : le meilleur point haut « gratuit » de la ville.',
  E'Montez à Pech David pour comprendre la ville d’un coup d’œil. Le belvédère offre un panorama large, surtout beau en fin de journée.\n\nMoins touristique que le centre, très apprécié des Toulousains pour une pause air pur.',
  'viewpoint',
  extensions.st_setsrid(extensions.st_makepoint(1.4675, 43.5688), 4326)::extensions.geography,
  'Chemin du Vallon',
  '31400',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  40,
  true,
  true,
  false,
  '{"tips":["Coucher de soleil recommandé.","Prévoir un peu de marche / dénivelé."],"best_moment":"Fin de journée","access":"Voiture ou bus + marche"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000010',
  '11111111-1111-1111-1111-111111111111',
  'canal-du-midi-port-saint-sauveur',
  'Canal du Midi (Port Saint-Sauveur)',
  'Ombre, eau et platanes : balade lente hors du centre touristique.',
  E'Le Canal du Midi commence (ou continue) ici une autre Toulouse : plus calme, plus verte. Autour du Port Saint-Sauveur, on marche, on court, on pique-nique.\n\nParfait quand le centre est trop bondé ou qu’il fait très chaud.',
  'walk',
  extensions.st_setsrid(extensions.st_makepoint(1.4620, 43.5985), 4326)::extensions.geography,
  'Port Saint-Sauveur',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  60,
  true,
  true,
  true,
  '{"tips":["Emportez de l’eau en été.","Continuez vers le parc de la Maourine si vous avez le temps."],"best_moment":"Matin","access":"Métro Jolimont / bus port Saint-Sauveur"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000011',
  '11111111-1111-1111-1111-111111111111',
  'parc-de-la-maourine',
  'Parc de la Maourine',
  'Grand parc nature en ville : plans d’eau, oiseaux et vraie respiration.',
  E'La Maourine, c’est l’option « nature » sans quitter Toulouse. Étangs, biodiversité et chemins pour marcher vraiment.\n\nIdéal famille, jogging ou simple besoin de silence après le centre.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4708, 43.6230), 4326)::extensions.geography,
  'Avenue de la Maourine',
  '31200',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  90,
  true,
  true,
  true,
  '{"tips":["Prenez des jumelles si vous aimez les oiseaux.","Prévoir chaussures adaptées après la pluie."],"best_moment":"Matin","access":"Métro Borderouge puis marche / bus"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000012',
  '11111111-1111-1111-1111-111111111111',
  'marche-victor-hugo',
  'Marché Victor Hugo',
  'Le bon plan gourmand : halles vivantes, fromages, et cassoulet à emporter.',
  E'Si vous ne « visitez » qu’un marché à Toulouse, que ce soit Victor Hugo. Ambiance, produits locaux et étages de restaurants au-dessus des halles.\n\nVenez tôt le week-end. C’est bruyant, généreux, très local — un vrai portrait de la ville.',
  'permanent_tip',
  extensions.st_setsrid(extensions.st_makepoint(1.4468, 43.6065), 4326)::extensions.geography,
  'Place Victor Hugo',
  '31000',
  'Toulouse',
  null,
  'paid',
  'Accès libre aux allées ; achats selon stands',
  'indoor',
  60,
  true,
  false,
  true,
  '{"tips":["Dimanche matin = ambiance max.","Montez aux restaurants des halles pour un déjeuner local."],"best_moment":"Matin (surtout week-end)","access":"Métro Jean Jaurès"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000013',
  '11111111-1111-1111-1111-111111111111',
  'place-saint-georges',
  'Place Saint-Georges',
  'Place arborée et terrasses : pause douce entre Carmes et Saint-Étienne.',
  E'Moins monumentale que le Capitole, Saint-Georges a un charme de quartier. Arbres, cafés, animation tranquille.\n\nParfait pour une pause entre deux visites, ou pour démarrer une soirée côté centre.',
  'square',
  extensions.st_setsrid(extensions.st_makepoint(1.4478, 43.6002), 4326)::extensions.geography,
  'Place Saint-Georges',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  30,
  true,
  true,
  true,
  '{"tips":["Superbe à l’ombre en été.","Enchaînez vers les Augustins ou Saint-Étienne."],"best_moment":"Après-midi","access":"Métro Esquirol / Carmes"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000014',
  '11111111-1111-1111-1111-111111111111',
  'cathedrale-saint-etienne',
  'Cathédrale Saint-Étienne',
  'Cathédrale asymétrique et surprenante, dans un quartier calme du centre.',
  E'Saint-Étienne intrigue : sa façade et son plan inhabituels racontent une histoire de chantier long et complexe. L’intérieur mérite le détour pour le calme et la lumière.\n\nLe quartier alentour est agréable à flâner, loin de la foule du Capitole.',
  'monument',
  extensions.st_setsrid(extensions.st_makepoint(1.4506, 43.5997), 4326)::extensions.geography,
  'Place Saint-Étienne',
  '31000',
  'Toulouse',
  null,
  'free',
  'Accès libre hors offices / événements',
  'mixed',
  40,
  true,
  false,
  true,
  '{"tips":["Combinez avec le Musée des Augustins.","Le parvis est agréable en fin de journée."],"best_moment":"Fin de matinée","access":"Métro Esquirol"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000015',
  '11111111-1111-1111-1111-111111111111',
  'fondation-bemberg',
  'Fondation Bemberg (Hôtel d’Assézat)',
  'Collection privée dans un hôtel Renaissance : art et architecture élégante.',
  E'L’Hôtel d’Assézat impressionne déjà de l’extérieur. À l’intérieur, la Fondation Bemberg propose une collection intimiste dans un cadre exceptionnel.\n\nUne visite culturelle « bijou », idéale si vous aimez les musées à taille humaine.',
  'museum',
  extensions.st_setsrid(extensions.st_makepoint(1.4417, 43.6003), 4326)::extensions.geography,
  'Hôtel d’Assézat, Place d’Assézat',
  '31000',
  'Toulouse',
  'https://www.fondation-bemberg.fr',
  'paid',
  'Entrée payante',
  'indoor',
  75,
  false,
  false,
  true,
  '{"tips":["Vérifiez les horaires (jours de fermeture).","Admirez la cour et la tour de l’hôtel."],"best_moment":"Après-midi","access":"Métro Esquirol"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000016',
  '11111111-1111-1111-1111-111111111111',
  'quai-des-savoirs',
  'Quai des Savoirs',
  'Culture scientifique ludique : expositions temporaires et curiosité tous publics.',
  E'Le Quai des Savoirs propose des expositions qui mêlent sciences, société et expérience. Moins « monument », plus « découverte active ».\n\nRegardez le programme : certaines expositions sont parfaites en famille, d’autres plus adultes.',
  'activity',
  extensions.st_setsrid(extensions.st_makepoint(1.4548, 43.5978), 4326)::extensions.geography,
  '39 Allée Jules Guesde',
  '31000',
  'Toulouse',
  'https://www.quaidessavoirs.fr',
  'paid',
  'Selon exposition',
  'indoor',
  90,
  true,
  false,
  true,
  '{"tips":["Idéal par mauvais temps.","Combinez avec une balade au Jardin des Plantes."],"best_moment":"Journée pluvieuse","access":"Près Palais de Justice / Jules Guesde"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000017',
  '11111111-1111-1111-1111-111111111111',
  'jardin-raymond-vi',
  'Jardin Raymond VI',
  'Pelouse contemporaine face à la Garonne, côté La Grave : horizon et détente.',
  E'Plus moderne que la Prairie des Filtres, le Jardin Raymond VI offre une grande pelouse ouverte et une belle lumière sur la Garonne.\n\nExcellent spot pique-nique / lecture, avec une ambiance un peu plus aérée.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4308, 43.6018), 4326)::extensions.geography,
  'Place Lange',
  '31300',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  60,
  true,
  true,
  true,
  '{"tips":["Très beau face au soleil du soir.","Accès facile depuis Saint-Cyprien / métro."],"best_moment":"Soirée","access":"Métro Saint-Cyprien République"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000018',
  '11111111-1111-1111-1111-111111111111',
  'rue-du-taur-flanerie',
  'Flânerie rue du Taur',
  'Le trait d’union rose entre Capitole et Saint-Sernin : vitrines, briques et ambiance.',
  E'Pas un monument, une expérience. La rue du Taur relie Place du Capitole à Saint-Sernin et concentre le charme piéton du centre.\n\nMarchez sans précipitation, levez les yeux sur les façades, puis terminez sur le parvis de la basilique.',
  'walk',
  extensions.st_setsrid(extensions.st_makepoint(1.4435, 43.6062), 4326)::extensions.geography,
  'Rue du Taur',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  35,
  true,
  true,
  true,
  '{"tips":["Parfait en enchaînement Capitole → Saint-Sernin.","Regardez les détails de briques et enseignes."],"best_moment":"Fin d’après-midi","access":"Métro Capitole"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-000000000019',
  '11111111-1111-1111-1111-111111111111',
  'bon-plan-coucher-soleil-saint-pierre',
  'Coucher de soleil à Saint-Pierre',
  'Le rituel toulousain : pont, eau, lumière rose et apéro improvisé.',
  E'Quand le ciel se teinte, le secteur Saint-Pierre / Pont Neuf devient magique. Pas besoin d’activité payante : juste être là au bon moment.\n\nArrivez 20 minutes avant le soleil couchant, trouvez un rebord de quai, et laissez la ville faire le spectacle.',
  'permanent_tip',
  extensions.st_setsrid(extensions.st_makepoint(1.4355, 43.6030), 4326)::extensions.geography,
  'Place Saint-Pierre',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  40,
  true,
  true,
  true,
  '{"tips":["Vérifiez l’heure du coucher de soleil.","Évitez les soirs d’orage orageux… ou assumez le drama."],"best_moment":"Coucher de soleil","access":"Métro Esquirol / Carmes"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000001a',
  '11111111-1111-1111-1111-111111111111',
  'musee-georges-labit',
  'Musée Georges Labit',
  'Petit musée d’arts asiatiques dans un écrin exotique, souvent méconnu.',
  E'Le Musée Georges Labit est un secret bien gardé : villa orientaliste, jardin et collections d’arts d’Asie. Calme, singulier, très différent des grands musées du centre.\n\nParfait si vous voulez sortir des sentiers battus sans quitter Toulouse.',
  'museum',
  extensions.st_setsrid(extensions.st_makepoint(1.4578, 43.5915), 4326)::extensions.geography,
  '17 Rue du Japon',
  '31400',
  'Toulouse',
  'https://www.museegeorgeslabit.fr',
  'paid',
  'Entrée payante',
  'mixed',
  70,
  true,
  false,
  true,
  '{"tips":["Le jardin vaut autant que les salles.","Moins fréquenté : agréable en semaine."],"best_moment":"Après-midi","access":"Bus / tram secteur Grand Rond – Japon"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000001b',
  '11111111-1111-1111-1111-111111111111',
  'parc-de-la-vache',
  'Parc de la Vache',
  'Parc de quartier généreux : aires de jeux, pelouses et vraie vie locale.',
  E'Moins « carte postale », plus « Toulouse du quotidien ». Le parc de la Vache est idéal pour une pause famille ou un footing hors centre touristique.\n\nUtile quand on cherche de l’espace sans enfiler les monuments.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.4205, 43.5790), 4326)::extensions.geography,
  'Avenue de Lardenne',
  '31100',
  'Toulouse',
  null,
  'free',
  null,
  'outdoor',
  75,
  true,
  true,
  true,
  '{"tips":["Bon plan famille hors hypercentre.","Prévoir un pique-nique simple."],"best_moment":"Week-end matin","access":"Bus secteur Lardenne / La Vache"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  'a1000000-0000-4000-8000-00000000001c',
  '11111111-1111-1111-1111-111111111111',
  'basilique-notre-dame-de-la-daurade',
  'Basilique de la Daurade',
  'Église au bord de la Garonne, visage spirituel des quais.',
  E'La Daurade marque le paysage des quais. Moins visitée que Saint-Sernin, elle offre un moment calme et une position idéale pour enchaîner sur une balade Garonne.\n\nEntrez si elle est ouverte : l’ambiance intérieure contraste avec l’animation des terrasses proches.',
  'monument',
  extensions.st_setsrid(extensions.st_makepoint(1.4336, 43.6006), 4326)::extensions.geography,
  'Place de la Daurade',
  '31000',
  'Toulouse',
  null,
  'free',
  null,
  'mixed',
  30,
  true,
  false,
  true,
  '{"tips":["Parfait avant/après une balade quais.","Secteur très vivant le soir."],"best_moment":"Fin d’après-midi","access":"Métro Esquirol"}'::jsonb,
  'published',
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (territory_id, slug) do update set
  name = excluded.name,
  summary = excluded.summary,
  description = excluded.description,
  place_type = excluded.place_type,
  location = excluded.location,
  address = excluded.address,
  postal_code = excluded.postal_code,
  city = excluded.city,
  website_url = excluded.website_url,
  price_type = excluded.price_type,
  price_details = excluded.price_details,
  indoor_outdoor = excluded.indoor_outdoor,
  recommended_duration_minutes = excluded.recommended_duration_minutes,
  family_friendly = excluded.family_friendly,
  dog_friendly = excluded.dog_friendly,
  accessible = excluded.accessible,
  details = excluded.details,
  status = 'published',
  published_at = coalesce(public.places.published_at, excluded.published_at),
  last_verified_at = timezone('utc', now()),
  updated_at = timezone('utc', now());

-- Provenance éditoriale (idempotente via external_id = slug).
insert into public.external_records (
  source_id,
  entity_type,
  entity_id,
  external_id,
  external_url,
  payload,
  payload_hash
)
select
  '22222222-2222-2222-2222-222222222203'::uuid,
  'place',
  place_row.id,
  place_row.slug,
  'https://tourose.app/catalogue/lieux/' || place_row.slug,
  jsonb_build_object(
    'kind', 'editorial_discovery',
    'slug', place_row.slug,
    'name', place_row.name
  ),
  encode(sha256(convert_to(place_row.slug || ':' || place_row.name, 'UTF8')), 'hex')
from public.places place_row
where place_row.id >= 'a1000000-0000-4000-8000-000000000001'::uuid
  and place_row.id <= 'a1000000-0000-4000-8000-00000000001c'::uuid
on conflict (source_id, entity_type, external_id) do update set
  entity_id = excluded.entity_id,
  payload = excluded.payload,
  payload_hash = excluded.payload_hash,
  last_seen_at = timezone('utc', now()),
  last_imported_at = timezone('utc', now()),
  updated_at = timezone('utc', now());
