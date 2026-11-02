-- Upgrade paid legacy readings without deleting their original result.
create schema if not exists guardiao_private;
revoke all on schema guardiao_private from public, anon;
grant usage on schema guardiao_private to authenticated;

create table if not exists guardiao_private.atualizacoes_consulta (
  mapa_id uuid primary key references public.mapas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assinatura text not null check (assinatura ~ '^[a-f0-9]{64}$'),
  contexto jsonb not null check (jsonb_typeof(contexto)='object'),
  anterior jsonb not null,
  fases jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz
);
create index if not exists atualizacoes_consulta_user_idx on guardiao_private.atualizacoes_consulta(user_id);
alter table guardiao_private.atualizacoes_consulta enable row level security;
revoke all on guardiao_private.atualizacoes_consulta from public, anon, authenticated;
create policy consulta_atualizacao_leitura_propria on guardiao_private.atualizacoes_consulta
  for select to authenticated using ((select auth.uid())=user_id);

-- The private worker owns writes; the public RPC is SECURITY INVOKER.
create or replace function guardiao_private.atualizar_consulta(
  p_acao text, p_mapa_id uuid, p_fase text default null,
  p_assinatura text default null, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare
  uid uuid:=auth.uid(); m public.mapas%rowtype; f public.perfis%rowtype;
  u guardiao_private.atualizacoes_consulta%rowtype;
  fase jsonb; r jsonb:='{}'::jsonb; k text; n integer; campo text;
begin
  if uid is null or p_acao is null or p_acao not in ('referencia','iniciar','liberar','concluir','finalizar')
    or p_mapa_id is null then return jsonb_build_object('estado','invalido'); end if;
  if not public.tem_acesso_guardiao() then return jsonb_build_object('estado','sem_acesso'); end if;
  perform pg_catalog.pg_advisory_xact_lock(58261,pg_catalog.hashtext(uid::text));
  select * into m from public.mapas where id=p_mapa_id and user_id=uid for update;
  if not found then return jsonb_build_object('estado','nao_encontrado'); end if;
  if m.resultado->>'versao_consulta'='2' then
    return jsonb_build_object('estado','concluido','mapa_id',m.id);
  end if;
  select * into u from guardiao_private.atualizacoes_consulta where mapa_id=m.id and user_id=uid for update;
  if p_acao='referencia' then
    return jsonb_build_object('estado','disponivel','referencia',u.contexto#>>'{dadosCiclos,referencia}',
      'assinatura',u.assinatura,'contexto',u.contexto);
  end if;
  if p_assinatura is null or p_assinatura !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('estado','invalido');
  end if;
  if p_acao='iniciar' then
    if p_fase is null or p_fase not in ('a','b','c','d','e','f')
      or jsonb_typeof(p_payload) is distinct from 'object'
      or length(p_payload::text)>60000
      or p_payload#>>'{teste,versao_consulta}' is distinct from '2' then
      return jsonb_build_object('estado','invalido');
    end if;
    foreach campo in array array['questao','cena','reacao','receio','desejo'] loop
      if length(btrim(coalesce(p_payload#>>array['teste','contexto_atual',campo],'')))<5 then
        return jsonb_build_object('estado','invalido');
      end if;
    end loop;
    if u.mapa_id is null then
      select * into f from public.perfis where id=uid;
      insert into guardiao_private.atualizacoes_consulta(mapa_id,user_id,assinatura,contexto,anterior)
      values(m.id,uid,p_assinatura,p_payload,jsonb_build_object('mapa',to_jsonb(m),'perfil',to_jsonb(f)))
      returning * into u;
    elsif u.assinatura<>p_assinatura then
      return jsonb_build_object('estado','questionario_ja_definido');
    end if;
    fase:=u.fases->p_fase;
    if fase->>'estado'='pronta' then return jsonb_build_object('estado','pronta','parte',fase->'parte'); end if;
    if fase->>'estado'='processando' and (fase->>'reservado_em')::timestamptz>now()-interval '120 seconds' then
      return jsonb_build_object('estado','processando');
    end if;
    if not public.is_guardiao_admin() then
      select count(*) into n from public.ai_requests where user_id=uid and created_at>now()-interval '24 hours';
      if n>=15 then return jsonb_build_object('estado','limite'); end if;
    end if;
    update guardiao_private.atualizacoes_consulta
      set fases=jsonb_set(fases,array[p_fase],jsonb_build_object('estado','processando','reservado_em',now())),atualizado_em=now()
      where mapa_id=m.id and user_id=uid;
    insert into public.ai_requests(user_id,fase) values(uid,p_fase);
    return jsonb_build_object('estado','reservada');
  end if;
  if u.mapa_id is null or u.assinatura<>p_assinatura then return jsonb_build_object('estado','invalido'); end if;
  if p_acao in ('concluir','liberar') then
    if p_fase is null or p_fase not in ('a','b','c','d','e','f') then return jsonb_build_object('estado','invalido'); end if;
    if u.fases#>>array[p_fase,'estado'] is distinct from 'processando' then return jsonb_build_object('ok',false); end if;
    if p_acao='concluir' then
      if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'versao_consulta' is distinct from '2'
        or length(p_payload::text)>80000 then return jsonb_build_object('ok',false); end if;
      fase:=jsonb_build_object('estado','pronta','parte',p_payload);
    else fase:=jsonb_build_object('estado','falhou'); end if;
    update guardiao_private.atualizacoes_consulta set fases=jsonb_set(fases,array[p_fase],fase),atualizado_em=now()
      where mapa_id=m.id and user_id=uid;
    return jsonb_build_object('ok',true);
  end if;
  -- Publish only a complete set of six server-saved phases. The old map stays
  -- available until this final transaction succeeds, and its snapshot is retained.
  foreach k in array array['a','b','c','d','e','f'] loop
    if u.fases#>>array[k,'estado'] is distinct from 'pronta' then
      return jsonb_build_object('estado','incompleto');
    end if;
    r:=r||(u.fases#>array[k,'parte']);
  end loop;
  if jsonb_typeof(r->'areas_vida') is distinct from 'object'
    or jsonb_typeof(r->'tabela_consulta') is distinct from 'array'
    or jsonb_typeof(r->'meses') is distinct from 'array'
    or jsonb_typeof(r#>'{plano,dias}') is distinct from 'array' then
    return jsonb_build_object('estado','incompleto');
  end if;
  select count(*) into n from jsonb_object_keys(r->'areas_vida');
  if n<>12 or jsonb_array_length(r->'tabela_consulta')<>6 or jsonb_array_length(r->'meses')<>12
    or jsonb_array_length(r#>'{plano,dias}')<>7 then return jsonb_build_object('estado','incompleto'); end if;
  select * into f from public.perfis where id=uid;
  r:=r||jsonb_build_object(
    'versao_consulta',2,
    'entrada_consulta',u.contexto#>'{teste,contexto_atual}',
    'dados_pessoa',jsonb_build_object('nome',f.nome,'nascimento',f.nascimento,'hora',f.hora,
      'cidade',concat_ws(', ',nullif(f.cidade,''),nullif(f.uf,'')),'lat',f.lat,'lon',f.lon,'tz',f.tz,'dst',f.dst,
      'data_referencia',u.contexto#>>'{dadosCiclos,referencia}'),
    'atualizacao_consulta',jsonb_build_object('data',now(),'versao_anterior_preservada',true)
  );
  update public.mapas set resultado=r where id=m.id and user_id=uid;
  update public.perfis set objetivo=u.contexto#>>'{teste,contexto_atual,questao}',aceite_lgpd_em=now() where id=uid;
  update guardiao_private.atualizacoes_consulta set concluido_em=now(),atualizado_em=now() where mapa_id=m.id and user_id=uid;
  return jsonb_build_object('estado','concluido','mapa_id',m.id);
end;
$function$;
revoke all on function guardiao_private.atualizar_consulta(text,uuid,text,text,jsonb) from public,anon;
grant execute on function guardiao_private.atualizar_consulta(text,uuid,text,text,jsonb) to authenticated;

create or replace function public.guardiao_atualizar_consulta(
  p_acao text,p_mapa_id uuid,p_fase text default null,
  p_assinatura text default null,p_payload jsonb default '{}'::jsonb
) returns jsonb language sql security invoker set search_path='' as $function$
  select guardiao_private.atualizar_consulta(p_acao,p_mapa_id,p_fase,p_assinatura,p_payload);
$function$;
revoke all on function public.guardiao_atualizar_consulta(text,uuid,text,text,jsonb) from public,anon;
grant execute on function public.guardiao_atualizar_consulta(text,uuid,text,text,jsonb) to authenticated;
