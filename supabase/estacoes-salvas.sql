-- Fila privada da atualização das estações. Apenas a administração cria trabalhos.
create table guardiao_private.estacoes_salvas (
 id uuid primary key default gen_random_uuid(),
 mapa_id uuid not null unique references public.mapas(id) on delete cascade,
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 contexto jsonb not null,anterior jsonb not null,fases jsonb not null default '{}',
 estado text not null default 'pendente' check(estado in ('pendente','processando','concluido','falhou','alterado')),
 fase_reservada text,reservado_em timestamptz,tentativas jsonb not null default '{}',ultima_falha text,
 valido_ate timestamptz not null,criado_em timestamptz not null default now(),concluido_em timestamptz
);
alter table guardiao_private.estacoes_salvas enable row level security;
revoke all on guardiao_private.estacoes_salvas from public,anon,authenticated;
create policy estacoes_acesso_direto_fechado on guardiao_private.estacoes_salvas for all to anon,authenticated using(false) with check(false);
create or replace function guardiao_private.processar_estacoes_salvas(
 p_acao text,p_job uuid,p_token text,p_fase text,p_payload jsonb
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare j guardiao_private.estacoes_salvas%rowtype;m public.mapas%rowtype;k text;n integer;merged jsonb;patch jsonb;
begin
 if p_acao is null or p_acao not in ('iniciar','concluir','liberar') or p_fase is null or p_fase not in ('f','d')
  or p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Trabalho não autorizado' using errcode='42501'; end if;
 select * into j from guardiao_private.estacoes_salvas where id=p_job for update;
 if not found or j.token_hash<>pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256'),'hex')
  or j.valido_ate<now() then raise exception 'Trabalho não autorizado' using errcode='42501'; end if;
 if j.estado='concluido' then return jsonb_build_object('estado','concluido'); end if;
 select * into m from public.mapas where id=j.mapa_id for update;
 if not found or m.resultado is distinct from j.anterior or m.resultado->>'versao_consulta' is distinct from '2' then
  update guardiao_private.estacoes_salvas set estado='alterado' where id=j.id;return jsonb_build_object('estado','alterado');
 end if;
 if p_acao='iniciar' then
  if j.fases->p_fase is not null then return jsonb_build_object('estado','pronta'); end if;
  if p_fase='d' and j.fases->'f' is null then return jsonb_build_object('estado','incompleto'); end if;
  foreach k in array array['questao','cena','reacao','receio','desejo'] loop
   if j.contexto#>>array['teste','contexto_atual',k] is distinct from m.resultado#>>array['entrada_consulta',k]
    or length(btrim(coalesce(j.contexto#>>array['teste','contexto_atual',k],'')))<5 then return jsonb_build_object('estado','incompleto'); end if;
  end loop;
  if j.contexto#>>'{teste,versao_estacoes}' is distinct from '1' then return jsonb_build_object('estado','incompleto'); end if;
  if j.estado='processando' and j.reservado_em>now()-interval '120 seconds' then return jsonb_build_object('estado','processando'); end if;
  n:=coalesce((j.tentativas->>p_fase)::integer,0);if n>=3 then return jsonb_build_object('estado','limite'); end if;
  update guardiao_private.estacoes_salvas set estado='processando',fase_reservada=p_fase,reservado_em=now(),
   tentativas=jsonb_set(tentativas,array[p_fase],to_jsonb(n+1)) where id=j.id;
  merged:=m.resultado||coalesce(j.fases->'f','{}');
  return jsonb_build_object('estado','reservada','mapa',to_jsonb(m)||jsonb_build_object('resultado',merged),
   'contexto',j.contexto,'orientacao_revisao',j.ultima_falha);
 end if;
 if j.estado<>'processando' or j.fase_reservada is distinct from p_fase then return jsonb_build_object('estado','invalido'); end if;
 if p_acao='liberar' then
  update guardiao_private.estacoes_salvas set estado='falhou',reservado_em=null,fase_reservada=null,ultima_falha=left(p_payload->>'erro',250) where id=j.id;
  return jsonb_build_object('estado','liberada');
 end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or length(p_payload::text)>90000
  or p_payload->>'versao_estacoes' is distinct from '1' then return jsonb_build_object('estado','incompleto'); end if;
 if p_fase='f' then
  if jsonb_typeof(p_payload->'meses') is distinct from 'array' then return jsonb_build_object('estado','incompleto'); end if;
  if jsonb_array_length(p_payload->'meses')<>12 then return jsonb_build_object('estado','incompleto'); end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'meses') x where coalesce(x->>'estacao','') not in ('inverno','primavera','verao','outono')) then return jsonb_build_object('estado','incompleto'); end if;
  patch:=jsonb_build_object('meses',p_payload->'meses','versao_estacoes',1,'metodo_mensal',p_payload->'metodo_mensal','referencia_mensal',p_payload->'referencia_mensal');
  update guardiao_private.estacoes_salvas set fases=jsonb_set(fases,'{f}',patch),estado='pendente',fase_reservada=null,reservado_em=null,ultima_falha=null where id=j.id;
  return jsonb_build_object('estado','pronta');
 end if;
 if jsonb_typeof(p_payload->'estacao_alma') is distinct from 'object' or jsonb_typeof(p_payload->'estacoes_areas') is distinct from 'object'
  or jsonb_typeof(p_payload->'estudo_estacoes') is distinct from 'object' or jsonb_typeof(p_payload->'sintese_respostas') is distinct from 'object'
  or jsonb_typeof(p_payload->'objetivo') is distinct from 'object' then return jsonb_build_object('estado','incompleto'); end if;
 if (select count(*) from jsonb_object_keys(p_payload->'estacoes_areas'))<>12 or
  p_payload#>>'{estacao_alma,estacao}' is distinct from j.fases#>>'{f,meses,0,estacao}' then return jsonb_build_object('estado','incompleto'); end if;
 foreach k in array array['questao','cena','reacao','receio','desejo'] loop
  if length(coalesce(p_payload#>>array['sintese_respostas',k],'')) not between 40 and 375 then return jsonb_build_object('estado','incompleto'); end if;
 end loop;
 patch:=jsonb_build_object('estacao_alma',p_payload->'estacao_alma','estacoes_areas',p_payload->'estacoes_areas',
  'estudo_estacoes',p_payload->'estudo_estacoes','versao_estacoes',1,'objetivo',p_payload->'objetivo',
  'sintese_respostas',p_payload->'sintese_respostas','ano',p_payload->'ano','integrada',p_payload->'integrada');
 -- A leitura final fica privada para conferência do PDF antes de substituir a versão salva.
 -- A publicação é feita pela administração após revisar F + D e conferir o snapshot anterior.
 update guardiao_private.estacoes_salvas set fases=jsonb_set(fases,'{d}',patch),estado='pendente',fase_reservada=null,reservado_em=null,ultima_falha=null where id=j.id;
 return jsonb_build_object('estado','pronta');
end;
$fn$;
revoke all on function guardiao_private.processar_estacoes_salvas(text,uuid,text,text,jsonb) from public;
grant usage on schema guardiao_private to anon,authenticated;
grant execute on function guardiao_private.processar_estacoes_salvas(text,uuid,text,text,jsonb) to anon,authenticated;
create or replace function public.guardiao_processar_estacoes_salvas(
 p_acao text,p_job uuid,p_token text,p_fase text,p_payload jsonb default '{}'
) returns jsonb language sql security invoker set search_path=''
as $fn$ select guardiao_private.processar_estacoes_salvas(p_acao,p_job,p_token,p_fase,p_payload); $fn$;
revoke all on function public.guardiao_processar_estacoes_salvas(text,uuid,text,text,jsonb) from public;
grant execute on function public.guardiao_processar_estacoes_salvas(text,uuid,text,text,jsonb) to anon,authenticated;
