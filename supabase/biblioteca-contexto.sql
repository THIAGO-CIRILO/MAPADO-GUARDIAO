-- Busca da geração: preserva a pesquisa administrativa existente.
-- O texto continua restrito ao administrador ou ao segredo do servidor.
create or replace function guardiao_private.buscar_biblioteca_contexto(
 p_consulta text,p_limite integer,p_chave text,p_categoria text
) returns table(trecho_id bigint,titulo text,autor text,categoria text,pagina integer,ordem integer,trecho text)
language plpgsql security definer set search_path=''
as $fn$
declare permitido boolean:=false; q pg_catalog.tsquery;
begin
 if auth.uid() is not null and public.is_guardiao_admin() then permitido:=true;
 elsif p_chave is not null and length(p_chave) between 48 and 192 then
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_chave,'UTF8'),'sha256'),'hex')=c.valor_hash
   into permitido from guardiao_private.configuracao c where c.chave='biblioteca_servidor';
 end if;
 if not coalesce(permitido,false) then raise exception 'Acesso não autorizado à biblioteca' using errcode='42501'; end if;
 if length(coalesce(p_consulta,'')) not between 2 and 180 then return; end if;
 if p_categoria is not null and p_categoria not in ('astrologia','ciclos','relacionamentos','espiritualidade','cabala','numerologia','metodo','outros') then return; end if;
 q:=pg_catalog.websearch_to_tsquery('portuguese'::regconfig,p_consulta);
 if q is null or q::text='' then return; end if;
 return query select t.id,l.titulo,l.autor,l.categoria,t.pagina,t.ordem,t.texto
 from public.biblioteca_trechos t join public.biblioteca_livros l on l.id=t.livro_id
 where l.ativo and l.situacao='pronto' and (p_categoria is null or l.categoria=p_categoria) and t.pesquisa @@ q
 order by pg_catalog.ts_rank_cd(t.pesquisa,q) desc,l.titulo,t.pagina,t.ordem
 limit least(greatest(coalesce(p_limite,2),1),8);
end;
$fn$;
revoke all on function guardiao_private.buscar_biblioteca_contexto(text,integer,text,text) from public;
grant usage on schema guardiao_private to anon,authenticated;
grant execute on function guardiao_private.buscar_biblioteca_contexto(text,integer,text,text) to anon,authenticated;
create or replace function public.biblioteca_buscar_contexto(
 p_consulta text,p_limite integer default 2,p_chave text default null,p_categoria text default null
) returns table(trecho_id bigint,titulo text,autor text,categoria text,pagina integer,ordem integer,trecho text)
language sql security invoker set search_path=''
as $fn$ select * from guardiao_private.buscar_biblioteca_contexto(p_consulta,p_limite,p_chave,p_categoria); $fn$;
revoke all on function public.biblioteca_buscar_contexto(text,integer,text,text) from public;
grant execute on function public.biblioteca_buscar_contexto(text,integer,text,text) to anon,authenticated;
