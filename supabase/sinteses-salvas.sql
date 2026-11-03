-- Trabalho administrativo pontual. Não oferece criação de jobs ao cliente.
-- O token aleatório só vale para um mapa, expira e nunca autoriza alterar respostas.
create table guardiao_private.sinteses_salvas (
 id uuid primary key default gen_random_uuid(),
 mapa_id uuid not null unique references public.mapas(id) on delete cascade,
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 contexto jsonb not null,
 anterior jsonb not null,
 nova_sintese jsonb,
 estado text not null default 'pendente' check(estado in ('pendente','processando','concluido','falhou','alterado')),
 valido_ate timestamptz not null,
 reservado_em timestamptz,
 criado_em timestamptz not null default now(),
 concluido_em timestamptz
);
alter table guardiao_private.sinteses_salvas enable row level security;
revoke all on guardiao_private.sinteses_salvas from public,anon,authenticated;
create or replace function guardiao_private.processar_sintese_salva(
 p_acao text,p_job uuid,p_token text,p_resultado jsonb
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare j guardiao_private.sinteses_salvas%rowtype; m public.mapas%rowtype; patch jsonb; k text;
begin
 if p_acao is null or p_acao not in ('iniciar','concluir','liberar') or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
  raise exception 'Trabalho não autorizado' using errcode='42501';
 end if;
 select * into j from guardiao_private.sinteses_salvas where id=p_job for update;
 if not found or j.token_hash<>pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256'),'hex')
  or j.valido_ate<now() then raise exception 'Trabalho não autorizado' using errcode='42501'; end if;
 if j.estado='concluido' then return jsonb_build_object('estado','concluido'); end if;
 select * into m from public.mapas where id=j.mapa_id for update;
 if not found or m.resultado is distinct from j.anterior or m.resultado->>'versao_consulta' is distinct from '2'
  or coalesce(m.resultado->'sintese_respostas','null'::jsonb)<>'null'::jsonb then
  update guardiao_private.sinteses_salvas set estado='alterado' where id=j.id;
  return jsonb_build_object('estado','alterado');
 end if;
 if p_acao='iniciar' then
  foreach k in array array['questao','cena','reacao','receio','desejo'] loop
   if length(btrim(coalesce(j.contexto#>>array['teste','contexto_atual',k],'')))<5
    or j.contexto#>>array['teste','contexto_atual',k] is distinct from m.resultado#>>array['entrada_consulta',k] then
    return jsonb_build_object('estado','incompleto');
   end if;
  end loop;
  if j.estado='processando' and j.reservado_em>now()-interval '120 seconds' then return jsonb_build_object('estado','processando'); end if;
  update guardiao_private.sinteses_salvas set estado='processando',reservado_em=now() where id=j.id;
  return jsonb_build_object('estado','reservada','mapa',to_jsonb(m),'contexto',j.contexto);
 end if;
 if j.estado<>'processando' then return jsonb_build_object('estado','invalido'); end if;
 if p_acao='liberar' then
  update guardiao_private.sinteses_salvas set estado='falhou',reservado_em=null where id=j.id;
  return jsonb_build_object('estado','liberada');
 end if;
 if jsonb_typeof(p_resultado) is distinct from 'object'
  or jsonb_typeof(p_resultado->'sintese_respostas') is distinct from 'object'
  or jsonb_typeof(p_resultado->'objetivo') is distinct from 'object'
  or length(p_resultado::text)>6000 then return jsonb_build_object('estado','incompleto'); end if;
 foreach k in array array['questao','cena','reacao','receio','desejo'] loop
  if jsonb_typeof(p_resultado#>array['sintese_respostas',k]) is distinct from 'string'
   or length(btrim(p_resultado#>>array['sintese_respostas',k])) not between 40 and 375
   then return jsonb_build_object('estado','incompleto'); end if;
 end loop;
 if jsonb_typeof(p_resultado#>'{objetivo,leitura}') is distinct from 'string'
  or jsonb_typeof(p_resultado#>'{objetivo,proximo_passo}') is distinct from 'string'
  or length(p_resultado#>>'{objetivo,leitura}') not between 40 and 650
  or length(p_resultado#>>'{objetivo,proximo_passo}') not between 20 and 250 then
  return jsonb_build_object('estado','incompleto');
 end if;
 -- Apenas estes sete textos podem ser publicados. O restante do mapa permanece igual.
 patch:=jsonb_build_object('objetivo',jsonb_build_object('leitura',p_resultado#>>'{objetivo,leitura}',
  'proximo_passo',p_resultado#>>'{objetivo,proximo_passo}'),'sintese_respostas',jsonb_build_object(
  'questao',p_resultado#>>'{sintese_respostas,questao}','cena',p_resultado#>>'{sintese_respostas,cena}',
  'reacao',p_resultado#>>'{sintese_respostas,reacao}','receio',p_resultado#>>'{sintese_respostas,receio}',
  'desejo',p_resultado#>>'{sintese_respostas,desejo}'));
 update public.mapas set resultado=resultado||patch where id=m.id;
 update guardiao_private.sinteses_salvas set estado='concluido',nova_sintese=patch,concluido_em=now() where id=j.id;
 return jsonb_build_object('estado','concluido');
end;
$fn$;
revoke all on function guardiao_private.processar_sintese_salva(text,uuid,text,jsonb) from public;
grant execute on function guardiao_private.processar_sintese_salva(text,uuid,text,jsonb) to anon,authenticated;
create or replace function public.guardiao_processar_sintese_salva(
 p_acao text,p_job uuid,p_token text,p_resultado jsonb default '{}'
) returns jsonb language sql security invoker set search_path=''
as $fn$ select guardiao_private.processar_sintese_salva(p_acao,p_job,p_token,p_resultado); $fn$;
revoke all on function public.guardiao_processar_sintese_salva(text,uuid,text,jsonb) from public;
grant execute on function public.guardiao_processar_sintese_salva(text,uuid,text,jsonb) to anon,authenticated;
